import { type Job, Queue, QueueEvents, Worker } from "bullmq";
import pino from "pino";
import { env } from "@/common/utils/env-config";
import { fetchJson } from "@/common/utils/fetch-json";
import { relationCache } from "../../../csv-import/contacts/processors/helpers/cache";
import { pool } from "../../../csv-import/contacts/processors/helpers/db";
import {
	collectUniqueRelationValues,
	handleRelations,
	relationFields,
	replaceOrgRelations,
} from "../../../csv-import/contacts/processors/helpers/relations";

const logger = pino({
	name: "orgRelationsWorker",
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

export const organizationsQueue = new Queue("organizationsQueue", {
	connection,
});
export const orgRelationsQueue = new Queue("orgRelationsQueue", { connection });

export const startOrgRelationsWorkers = async () => {
	const orgQueueEvents = new QueueEvents("organizationsQueue", { connection });
	await orgQueueEvents.waitUntilReady();
	orgQueueEvents.on("drained", async () => {
		logger.info("organizationsQueue drained → resuming orgRelationsQueue");
		await relationsWorker.resume();
	});

	const relationsQueueEvents = new QueueEvents("orgRelationsQueue", {
		connection,
	});
	await relationsQueueEvents.waitUntilReady();
	relationsQueueEvents.on("failed", ({ jobId, failedReason }) => {
		logger.error({ jobId, failedReason }, " QueueEvents: job failed");
	});

	const relationsWorker = new Worker(
		"orgRelationsQueue",
		async (job: Job) => {
			try {
				// === ensureRelations ===
				if (job.name === "ensureRelations") {
					const { organizations } = job.data as { organizations: any[] };
					logger.info(
						{ jobId: job.id, orgCount: organizations.length },
						"ensureRelations: received organizations",
					);

					const uniques = await collectUniqueRelationValues(organizations);
					logger.info(
						{ jobId: job.id, endpoints: Object.keys(uniques).length },
						"ensureRelations: will process endpoints",
					);

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
							const batch = missing.slice(i, i + BULK_CREATE_BATCH_SIZE);
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
										data: batch.map((name) => ({ name })),
									}),
								});

								if (!resp?.success) {
									throw new Error(
										`bulkCreate failed for ${entity}: ${resp?.message || "no message"}`,
									);
								}
								const items = Array.isArray(resp.items) ? resp.items : [];
								if (items.length !== batch.length) {
									logger.warn(
										`bulkCreate for ${entity}: returned ${items.length}/${batch.length} items`,
									);
								}
								batch.forEach((n, idx) => {
									const created = items[idx];
									if (created) {
										cache.set(n, {
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
										batchIndex: Math.floor(i / BULK_CREATE_BATCH_SIZE) + 1,
										message: err.message,
									},
									"  • bulk-create batch failed",
								);
								throw err;
							}
						}
					}

					// enqueue linkRelations
					for (let i = 0; i < organizations.length; i += LINK_BATCH_SIZE) {
						const slice = organizations.slice(i, i + LINK_BATCH_SIZE);
						await orgRelationsQueue.add("linkRelations", {
							organizations: slice,
						});
					}

					return { ok: true };
				}

				// === linkRelations ===
				if (job.name === "linkRelations") {
					const { organizations } = job.data as { organizations: any[] };

					const mapped = await Promise.all(
						organizations.map(async (org) => ({
							id: org.id,
							data: await handleRelations(org),
						})),
					);
					logger.info({ jobId: job.id }, "Resolved relation IDs for all orgs");

					const linkMap: Record<string, Array<[number, number]>> = {};

					for (const { id: orgId, data } of mapped) {
						for (const [fieldKey, endpoint] of Object.entries(relationFields)) {
							const val = data[fieldKey];
							if (Array.isArray(val)) {
								val.forEach((rid) => {
									linkMap[endpoint] ||= [];
									linkMap[endpoint].push([orgId, rid]);
								});
							} else if (typeof val === "number") {
								linkMap[endpoint] ||= [];
								linkMap[endpoint].push([orgId, val]);
							}
						}
					}

					const joinConfig: Record<string, { table: string; relCol: string }> =
						{
							sources: {
								table: "sources_organizations_lnk",
								relCol: "source_id",
							},
							industries: {
								table: "organizations_industry_lnk",
								relCol: "industry_id",
							},
							frequencies: {
								table: "organizations_frequency_lnk",
								relCol: "frequency_id",
							},
							"media-types": {
								table: "organizations_media_type_lnk",
								relCol: "media_type_id",
							},
							"organization-types": {
								table: "organizations_organization_type_lnk",
								relCol: "organization_type_id",
							},
							lists: { table: "organizations_lists_lnk", relCol: "list_id" },
						};

					for (const [endpoint, pairs] of Object.entries(linkMap)) {
						const cfg = joinConfig[endpoint];
						if (!cfg) {
							logger.warn(
								{ jobId: job.id, endpoint },
								"No table for endpoint, skipping",
							);
							continue;
						}
						for (let i = 0; i < pairs.length; i += DB_CHUNK_SIZE) {
							const chunk = pairs.slice(i, i + DB_CHUNK_SIZE);
							const placeholders = chunk
								.map((_, idx) => `($${idx * 2 + 1},$${idx * 2 + 2})`)
								.join(",");
							const flat = chunk.flat();
							const start = Date.now();
							try {
								await pool.query(
									`INSERT INTO ${cfg.table} (organization_id, ${cfg.relCol})
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
										chunkIndex: Math.floor(i / DB_CHUNK_SIZE) + 1,
										message: err.message,
									},
									"  • DB insert chunk failed",
								);
								throw err;
							}
						}
					}

					logger.info(
						{ jobId: job.id, linkedCount: organizations.length },
						"linkRelations done",
					);
					return { linkedCount: organizations.length };
				}

				if (job.name === "replaceOrgRelations") {
					return await replaceOrgRelations(job);
				}

				throw new Error(`Unknown job name ${job.name}`);
			} catch (err: any) {
				logger.error(
					{
						jobId: job.id,
						name: job.name,
						data: job.data,
						message: err.message,
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

	await relationsWorker.pause();
	const counts = await organizationsQueue.getJobCounts(
		"waiting",
		"active",
		"delayed",
	);
	if (counts.waiting === 0 && counts.active === 0 && counts.delayed === 0) {
		logger.info("organizationsQueue empty → resuming orgRelationsQueue");
		await relationsWorker.resume();
	}

	relationsWorker.on("failed", (job, err) => {
		logger.error(
			{ jobId: job?.id, name: job?.name, message: err.message },
			" Job has failed",
		);
	});
};
