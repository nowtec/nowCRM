import { type Job, Queue, QueueEvents, Worker } from "bullmq";
import pino from "pino";
import { env } from "@/common/utils/env-config";
import { fetchJson } from "@/common/utils/fetch-json";
import { ensureEmailSubscription } from "../../../csv-import/contacts/processors/contacts/subscription";
import { relationCache } from "../../../csv-import/contacts/processors/helpers/cache";
import { pool } from "../../../csv-import/contacts/processors/helpers/db";
import {
	collectUniqueRelationValues,
	handleRelations,
	relationFields,
	replaceRelations,
} from "../../../csv-import/contacts/processors/helpers/relations";

const logger = pino({
	name: "relationsWorker",
	transport: { target: "pino-pretty" },
});

const connection = {
	host: env.DAL_REDIS_HOST,
	port: env.DAL_REDIS_PORT,
};

const MAX_CONSECUTIVE_ERRORS = 10;
let _circuitBroken = false;
const responseTimes: number[] = [];
let consecutiveErrors = 0;

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
	const contactsQueueEvents = new QueueEvents("contactsQueue", { connection });
	await contactsQueueEvents.waitUntilReady();
	contactsQueueEvents.on("drained", async () => {
		logger.info("contactsQueue drained → resuming relationsQueue processing");
		await relationsWorker.resume();
	});

	const relationsQueueEvents = new QueueEvents("relationsQueue", {
		connection,
	});
	await relationsQueueEvents.waitUntilReady();
	relationsQueueEvents.on("failed", ({ jobId, failedReason }) => {
		logger.error({ jobId, failedReason }, " QueueEvents: job failed");
	});

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

						for (let i = 0; i < missing.length; i += BULK_CREATE_BATCH_SIZE) {
							const batchNames = missing.slice(i, i + BULK_CREATE_BATCH_SIZE);
							const batchNum = Math.floor(i / BULK_CREATE_BATCH_SIZE) + 1;
							try {
								const resp = await fetchJson<{
									success: boolean;
									items?: { id: number; documentId: string }[];
									message?: string;
								}>(`${env.STRAPI_URL}contacts/bulk-create`, {
									method: "POST",
									headers,
									body: JSON.stringify({
										entity,
										data: batchNames.map((name) => ({ name })),
									}),
								});

								if (!resp?.success) {
									throw new Error(
										`bulkCreate failed for ${entity}: ${resp?.message || "no message"}`,
									);
								}

								const items = Array.isArray(resp.items) ? resp.items : [];
								if (items.length !== batchNames.length) {
									logger.warn(
										`bulkCreate for ${entity}: returned ${items.length}/${batchNames.length} items`,
									);
								}
								//сheck here
								batchNames.forEach((name, idx) => {
									const created = items[idx];
									if (created) {
										cache.set(name, {
											id: created.id,
											documentId: created.documentId,
										});
									}
								});
							} catch (err: any) {
								logger.error(
									{
										jobId: job.id,
										endpoint,
										batchNum,
										message: err.message,
										stack: err.stack,
									},
									"  • bulk-create batch failed",
								);
								throw err;
							}
						}
					}

					// enqueue linkRelations jobs
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
					if (listId) linkMap.lists = contacts.map((c) => [c.id, listId]);

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

					const joinConfig: Record<string, { table: string; relCol: string }> =
						{
							organizations: {
								table: "contacts_organization_lnk",
								relCol: "organization_id",
							},
							"contact-interests": {
								table: "contacts_contact_interests_lnk",
								relCol: "contact_interest_id",
							},
							departments: {
								table: "contacts_department_lnk",
								relCol: "department_id",
							},
							keywords: {
								table: "keywords_contacts_lnk",
								relCol: "keyword_id",
							},
							job_titles: {
								table: "contacts_job_title_lnk",
								relCol: "job_title_id",
							},
							tags: { table: "contacts_tags_lnk", relCol: "tag_id" },
							sources: { table: "sources_contacts_lnk", relCol: "source_id" },
							contact_notes: { table: "notes_contact_lnk", relCol: "note_id" },
							contact_ranks: { table: "ranks_contacts_lnk", relCol: "rank_id" },
							"contact-types": {
								table: "contacts_contact_types_lnk",
								relCol: "contact_type_id",
							},
							industries: {
								table: "contacts_industry_lnk",
								relCol: "industry_id",
							},
							"contact-salutations": {
								table: "contacts_salutation_lnk",
								relCol: "contact_salutation_id",
							},
							"contact-titles": {
								table: "contacts_title_lnk",
								relCol: "contact_title_id",
							},
							lists: { table: "contacts_lists_lnk", relCol: "list_id" },
						};

					for (const [endpoint, pairs] of Object.entries(linkMap)) {
						const cfg = joinConfig[endpoint];
						if (!cfg) {
							logger.warn(
								{ jobId: job.id, endpoint },
								"No table configured for endpoint, skipping",
							);
							continue;
						}
						for (let i = 0; i < pairs.length; i += DB_CHUNK_SIZE) {
							const chunk = pairs.slice(i, i + DB_CHUNK_SIZE);
							const chunkNum = Math.floor(i / DB_CHUNK_SIZE) + 1;
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
								responseTimes.push(Date.now() - start);
							} catch (err: any) {
								responseTimes.push(Date.now() - start);
								consecutiveErrors++;
								if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS)
									_circuitBroken = true;
								logger.error(
									{
										jobId: job.id,
										endpoint,
										chunkNum,
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

	await relationsWorker.pause();
	const counts = await contactsQueue.getJobCounts(
		"waiting",
		"active",
		"delayed",
	);
	if (counts.waiting === 0 && counts.active === 0 && counts.delayed === 0) {
		logger.info("contactsQueue empty → starting relationsQueue processing");
		await relationsWorker.resume();
	}
};
