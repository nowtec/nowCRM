import axios from "axios";
import { type Job, Queue, QueueEvents, Worker } from "bullmq";
import pino from "pino";
import { env } from "@/common/utils/env-config";
import { ensureEmailSubscription } from "../functions/contacts/subscription";
import { relationCache } from "../functions/helpers/cache";
import { pool } from "../functions/helpers/db";
import {
	collectUniqueRelationValues,
	handleRelations,
	relationFields,
	replaceRelations,
} from "../functions/helpers/relations";

const logger = pino({
	name: "relationsWorker",
	transport: { target: "pino-pretty" },
});
const connection = {
	host: env.DAL_REDIS_HOST,
	port: env.DAL_REDIS_PORT,
};

// Circuit-breaker & concurrency settings
const MAX_CONSECUTIVE_ERRORS = 10;
let _circuitBroken = false;
const responseTimes: number[] = [];
let consecutiveErrors = 0;

// Batch sizes
const LINK_BATCH_SIZE = 1000;
const BULK_CREATE_BATCH_SIZE = 50;
const DB_CHUNK_SIZE = 500;

function toSingular(plural: string): string {
	if (plural.endsWith("ies")) return `${plural.slice(0, -3)}y`;
	if (plural.endsWith("s")) return plural.slice(0, -1);
	return plural;
}

export const contactsQueue = new Queue("contactsQueue", { connection });
export const relationsQueue = new Queue("relationsQueue", { connection });

export const startRelationsWorkers = async () => {
	// Subscribe to contactsQueue events
	const contactsQueueEvents = new QueueEvents("contactsQueue", { connection });
	await contactsQueueEvents.waitUntilReady();
	contactsQueueEvents.on("drained", async () => {
		logger.info("contactsQueue drained → resuming relationsQueue processing");
		await relationsWorker.resume();
	});

	// (Optional) Subscribe to relationsQueue events
	const relationsQueueEvents = new QueueEvents("relationsQueue", {
		connection,
	});
	await relationsQueueEvents.waitUntilReady();
	relationsQueueEvents.on("failed", ({ jobId, failedReason }) => {
		logger.error({ jobId, failedReason }, " QueueEvents: job failed");
	});
	relationsQueueEvents.on("completed", ({ jobId }) => {});

	// Worker for relationsQueue
	const relationsWorker = new Worker(
		"relationsQueue",
		async (job: Job) => {
			try {
				// === ensureRelations ===
				if (job.name === "ensureRelations") {
					const { contacts, subscribeAll = false } = job.data as {
						contacts: any[];
						subscribeAll?: boolean;
					};
					logger.info(
						{ jobId: job.id, contactsCount: contacts.length },
						"ensureRelations: received contacts",
					);

					// collect & bulk-create missing relation values
					const uniques = await collectUniqueRelationValues(contacts);

					const headers = {
						Authorization: `Bearer ${env.DAL_STRAPI_API_TOKEN}`,
						"Content-Type": "application/json",
					};

					for (const [endpoint, values] of Object.entries(uniques)) {
						if (values.size === 0) continue;

						if (!relationCache[endpoint]) {
							relationCache[endpoint] = new Map();
						}
						const cache = relationCache[endpoint];
						const missing = Array.from(values).filter((v) => !cache.has(v));
						if (missing.length === 0) continue;

						const singular = toSingular(endpoint);
						const entity = singular.replace(/_/g, "-");
						const _totalBatches = Math.ceil(
							missing.length / BULK_CREATE_BATCH_SIZE,
						);

						for (let i = 0; i < missing.length; i += BULK_CREATE_BATCH_SIZE) {
							const batchNumber = Math.floor(i / BULK_CREATE_BATCH_SIZE) + 1;
							const batchNames = missing.slice(i, i + BULK_CREATE_BATCH_SIZE);
							try {
								const resp = await axios.post(
									`${env.STRAPI_URL}/api/contacts/bulk-create`,
									{ entity, data: batchNames.map((name) => ({ name })) },
									{ headers },
								);

								if (!resp.data?.success) {
									throw new Error(
										`bulkCreate failed for ${entity}: ${resp.data?.message || "no message"}`,
									);
								}
								const ids: number[] = resp.data.ids || [];
								if (ids.length !== batchNames.length) {
									throw new Error(
										`bulkCreate returned ${ids.length} ids for ${batchNames.length} items`,
									);
								}
								batchNames.forEach((n, idx) => cache.set(n, ids[idx]));
							} catch (err: any) {
								logger.error(
									{
										jobId: job.id,
										endpoint,
										batchNumber,
										message: err.message,
										stack: err.stack,
									},
									"  • bulk-create batch failed",
								);
								throw err;
							}
						}
					}

					// enqueue linkRelations jobs in slices
					for (let i = 0; i < contacts.length; i += LINK_BATCH_SIZE) {
						const slice = contacts.slice(i, i + LINK_BATCH_SIZE);
						await relationsQueue.add("linkRelations", {
							contacts: slice,
							listId: job.data.listId,
							subscribeAll,
						});
					}

					return { ok: true };
				}

				// === linkRelations ===
				if (job.name === "linkRelations") {
					const { contacts, subscribeAll = false } = job.data as {
						contacts: any[];
						subscribeAll?: boolean;
					};
					const listId = job.data.listId as number | undefined;

					// 1. Resolve all relation IDs
					const mapped = await Promise.all(
						contacts.map(async (contact) => ({
							id: contact.id,
							data: await handleRelations(contact),
						})),
					);
					logger.info(
						{ jobId: job.id },
						"Resolved relation IDs for all contacts",
					);

					const linkMap: Record<string, Array<[number, number]>> = {};

					if (listId) {
						linkMap.lists = contacts.map((contact) => [contact.id, listId]);
					}

					logger.info(
						{ jobId: job.id },
						"Resolved relation IDs for all contacts",
					);

					if (subscribeAll) {
						for (const contact of contacts) {
							try {
								await ensureEmailSubscription(contact.id);
							} catch (err: any) {
								logger.error(
									{ contactId: contact.id, message: err.message },
									"Failed to ensure Email/Basic subscription",
								);
								throw err;
							}
						}
					}

					// 2) Build linkMap: endpoint → [ [contact_id, rel_id], … ]
					for (const { id: contactId, data } of mapped) {
						for (const [fieldKey, endpoint] of Object.entries(relationFields)) {
							const val = data[fieldKey];
							if (Array.isArray(val)) {
								val.forEach((rid) => {
									linkMap[endpoint] ||= [];
									linkMap[endpoint].push([contactId, rid]);
								});
							} else if (typeof val === "number") {
								linkMap[endpoint] ||= [];
								linkMap[endpoint].push([contactId, val]);
							}
						}
					}

					// 3) joinConfig
					const joinConfig: Record<string, { table: string; relCol: string }> =
						{
							organizations: {
								table: "contacts_organization_links",
								relCol: "organization_id",
							},
							"contact-interests": {
								table: "contacts_contact_interests_links",
								relCol: "contact_interest_id",
							},
							departments: {
								table: "contacts_department_links",
								relCol: "department_id",
							},
							keywords: {
								table: "keywords_contacts_links",
								relCol: "keyword_id",
							},
							job_titles: {
								table: "contacts_job_title_links",
								relCol: "job_title_id",
							},
							tags: {
								table: "contacts_tags_links",
								relCol: "tag_id",
							},
							sources: { table: "sources_contacts_links", relCol: "source_id" },
							notes: { table: "notes_contact_links", relCol: "note_id" },
							ranks: { table: "ranks_contacts_links", relCol: "rank_id" },
							"contact-types": {
								table: "contacts_contact_types_links",
								relCol: "contact_type_id",
							},
							industries: {
								table: "contacts_industry_links",
								relCol: "industry_id",
							},
							"contact-salutations": {
								table: "contacts_salutation_links",
								relCol: "contact_salutation_id",
							},
							"contact-titles": {
								table: "contacts_title_links",
								relCol: "contact_title_id",
							},
							lists: { table: "contacts_lists_links", relCol: "list_id" },
						};

					// 4) Chunk & INSERT … ON CONFLICT DO NOTHING
					for (const [endpoint, pairs] of Object.entries(linkMap)) {
						const cfg = joinConfig[endpoint];
						if (!cfg) {
							logger.warn(
								{ jobId: job.id, endpoint },
								"No table configured for endpoint, skipping",
							);
							continue;
						}
						const _totalChunks = Math.ceil(pairs.length / DB_CHUNK_SIZE);
						for (let i = 0; i < pairs.length; i += DB_CHUNK_SIZE) {
							const chunkNumber = Math.floor(i / DB_CHUNK_SIZE) + 1;
							const chunk = pairs.slice(i, i + DB_CHUNK_SIZE);
							const placeholders = chunk
								.map((_, idx) => `($${idx * 2 + 1},$${idx * 2 + 2})`)
								.join(",");
							const flat = chunk.flat();

							const start = Date.now();
							try {
								await pool.query(
									`INSERT INTO ${cfg.table} (contact_id, ${cfg.relCol})
                   VALUES ${placeholders}
                   ON CONFLICT DO NOTHING`,
									flat,
								);
								const dur = Date.now() - start;
								responseTimes.push(dur);
							} catch (err: any) {
								const errDur = Date.now() - start;
								responseTimes.push(errDur);
								consecutiveErrors++;
								if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
									_circuitBroken = true;
								}
								logger.error(
									{
										jobId: job.id,
										endpoint,
										chunkNumber,
										durationMs: errDur,
										message: err.message,
										stack: err.stack,
									},
									"  • DB insert chunk failed",
								);
								throw err;
							}
						}
					}

					logger.info(
						{ jobId: job.id, linkedCount: contacts.length },
						"linkRelations completed",
					);
					return { linkedCount: contacts.length };
				}

				if (job.name === "replaceRelations") {
					return await replaceRelations(job);
				}

				throw new Error(`Unknown job name ${job.name}`);
			} catch (err: any) {
				logger.error(
					{
						jobId: job.id,
						name: job.name,
						data: job.data,
						message: err.message,
						stack: err.stack,
					},
					" Job failed",
				);
				throw err;
			}
		},
		{
			connection,
			concurrency: 1,
			lockDuration: 600000,
		},
	);

	// Worker-level events
	relationsWorker.on("active", (_job) => {});
	relationsWorker.on("completed", (_job) => {});
	relationsWorker.on("failed", (job, err) => {
		logger.error(
			{
				jobId: job?.id,
				name: job?.name,
				message: err.message,
				stack: err.stack,
			},
			" Job has failed",
		);
	});
	relationsWorker.on("error", (err) => {
		logger.error({ message: err.message, stack: err.stack }, " Worker error");
	});

	// Start paused; resume when appropriate
	await relationsWorker.pause();
	const counts = await contactsQueue.getJobCounts(
		"waiting",
		"active",
		"delayed",
	);
	if (counts.waiting === 0 && counts.active === 0 && counts.delayed === 0) {
		logger.info(
			"contactsQueue is empty on startup → starting relationsQueue processing",
		);
		await relationsWorker.resume();
	}
};
