import http from "node:http";
import https from "node:https";
import axios from "axios";
import { Worker as BullWorker, type Job } from "bullmq";
import pLimit from "p-limit";
import { pino } from "pino";
// orgsWorker.ts
import { env } from "@/common/utils/envConfig";
import { orgRelationsQueue } from "@/lib/workers/relationWorkerOrg";
import { relationCache } from "../functions/helpers/cache";
import { waitForStrapi } from "../functions/helpers/checkStrapi";
import { cleanEmptyStringsToNull } from "../functions/organizations/clean";
import { validateEnumerations } from "../functions/organizations/enumerations";
import { isOrganizationInCache } from "../functions/organizations/iscache";
import { sanitizeOrganizations } from "../functions/organizations/sanitize";

function buildFullOrgsArray(
	originalOrgs: any[],
	updateOrgs: any[],
	existingOrgIds: number[],
	newOrgs: any[],
	createdIds: number[],
): Array<any & { id: number }> {
	const full: Array<any & { id: number }> = [];
	let newIdx = 0;
	let existingIdx = 0;

	for (const org of originalOrgs) {
		if (updateOrgs.includes(org)) {
			full.push({ ...org, id: existingOrgIds[existingIdx++] });
		} else {
			full.push({ ...newOrgs[newIdx], id: createdIds[newIdx] });
			newIdx++;
		}
	}
	return full;
}

const httpAgent = new http.Agent({
	keepAlive: true,
	maxSockets: 100,
	maxTotalSockets: 200,
});

const httpsAgent = new https.Agent({
	keepAlive: true,
	maxSockets: 100,
	maxTotalSockets: 200,
});

const api = axios.create({
	baseURL: env.DAL_STRAPI_API_URL,
	timeout: 30_000,
	httpAgent,
	httpsAgent,
	maxBodyLength: Number.POSITIVE_INFINITY,
	maxContentLength: Number.POSITIVE_INFINITY,
	transitional: { clarifyTimeoutError: true },
});

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
const jitter = (baseMs: number, factor = 0.3) => {
	const rnd = 1 - factor + Math.random() * factor * 2;
	return Math.floor(baseMs * rnd);
};

let httpConcurrency = 5;
let httpLimit = pLimit(httpConcurrency);
function reinitHttpLimiter(newConc: number) {
	httpConcurrency = newConc;
	httpLimit = pLimit(httpConcurrency);
}

async function postWithRetry<T = any>(
	url: string,
	data: any,
	opts: any,
	attempts = 5,
): Promise<T> {
	let delay = 500;
	for (let i = 1; i <= attempts; i++) {
		try {
			const res = await httpLimit(() => api.post<T>(url, data, opts));
			return res.data;
		} catch (err: any) {
			const code = err?.code;
			const msg = err?.message || "";
			const retriable =
				code === "ECONNRESET" ||
				code === "EPIPE" ||
				code === "ETIMEDOUT" ||
				msg.includes("socket hang up");

			if (!retriable || i === attempts) throw err;
			await sleep(jitter(delay));
			delay *= 2;
		}
	}
	throw new Error("Unreachable");
}

const ORG_CREATE_URL = "/api/contacts/bulk-create";
const ORG_UPDATE_URL = "/api/contacts/bulk-update";

export const startOrganizationsWorkers = () => {
	for (let i = 0; i < env.DAL_WORKER_COUNT; i++) {
		const workerId = `OrgsWorker-${i + 1}`;

		// Circuit-breaker & concurrency settings
		const MIN_CONCURRENCY = 5;
		const MAX_CONCURRENCY = 50;
		const INITIAL_CONCURRENCY = 15;
		const RESPONSE_WINDOW = 30;
		const RAMP_UP_THRESHOLD = 300;
		const RAMP_DOWN_THRESHOLD = 800;
		const CIRCUIT_BREAK_THRESHOLD = 2000;
		const BATCH_COOLDOWN_BASE = 1000;
		const MAX_CONSECUTIVE_ERRORS = 10;

		let circuitBroken = false;
		let circuitRecoveryTime = 3000;
		const MAX_CIRCUIT_RECOVERY = 30000;

		let concurrency = INITIAL_CONCURRENCY;
		let _limit = pLimit(concurrency);
		const responseTimes: number[] = [];
		let consecutiveErrors = 0;
		let httpErrorsInRow = 0;

		const logger = pino({
			name: workerId,
			transport: { target: "pino-pretty" },
		});

		function reinitLimiter() {
			_limit = pLimit(concurrency);
		}

		async function triggerCircuitBreaker(reason: string) {
			if (circuitBroken) return;
			circuitBroken = true;
			logger.warn(
				`[${workerId}] 🔌 Circuit breaker: ${reason}, pausing ${circuitRecoveryTime}ms`,
			);
			await sleep(circuitRecoveryTime);
			circuitRecoveryTime = Math.min(
				circuitRecoveryTime * 1.5,
				MAX_CIRCUIT_RECOVERY,
			);
			concurrency = Math.max(MIN_CONCURRENCY, Math.floor(concurrency * 0.7));
			reinitLimiter();
			reinitHttpLimiter(Math.max(1, Math.floor(httpConcurrency * 0.7)));

			responseTimes.length = 0;
			consecutiveErrors = 0;
			httpErrorsInRow = 0;
			circuitBroken = false;
			logger.info(
				`[${workerId}] 🔌 Circuit restored. Concurrency=${concurrency}, httpConc=${httpConcurrency}`,
			);
		}

		function adjustConcurrency() {
			const avg =
				responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length;
			if (avg > CIRCUIT_BREAK_THRESHOLD) {
				void triggerCircuitBreaker(`avg response ${avg.toFixed(0)}ms`);
			} else if (avg < RAMP_UP_THRESHOLD && concurrency < MAX_CONCURRENCY) {
				concurrency += avg < RAMP_UP_THRESHOLD / 2 ? 2 : 1;
				concurrency = Math.min(concurrency, MAX_CONCURRENCY);
				reinitLimiter();
				logger.info(
					`[${workerId}] ⏫ Concurrency↑ to ${concurrency} (avg=${avg.toFixed(0)}ms)`,
				);
			} else if (avg > RAMP_DOWN_THRESHOLD && concurrency > MIN_CONCURRENCY) {
				concurrency--;
				reinitLimiter();
				logger.info(
					`[${workerId}] ⏬ Concurrency↓ to ${concurrency} (avg=${avg.toFixed(0)}ms)`,
				);
			}

			if (avg < RAMP_UP_THRESHOLD && httpConcurrency < 20) {
				reinitHttpLimiter(httpConcurrency + 1);
				logger.info(
					`[${workerId}] ⏫ HTTP concurrency↑ to ${httpConcurrency} (avg=${avg.toFixed(0)}ms)`,
				);
			} else if (avg > RAMP_DOWN_THRESHOLD && httpConcurrency > 2) {
				reinitHttpLimiter(httpConcurrency - 1);
				logger.info(
					`[${workerId}] ⏬ HTTP concurrency↓ to ${httpConcurrency} (avg=${avg.toFixed(0)}ms)`,
				);
			}
		}

		function recordResponseTime(durationMs: number, isError = false) {
			responseTimes.push(durationMs);
			if (responseTimes.length > RESPONSE_WINDOW) responseTimes.shift();
			if (isError) {
				consecutiveErrors++;
				if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
					void triggerCircuitBreaker("too many errors");
				}
			} else {
				consecutiveErrors = Math.max(0, consecutiveErrors - 0.5);
			}
			if (responseTimes.length >= Math.min(5, RESPONSE_WINDOW)) {
				adjustConcurrency();
			}
		}

		function onHttpError() {
			httpErrorsInRow++;
			if (httpErrorsInRow >= 5) {
				void triggerCircuitBreaker("[HTTP] too many socket resets");
			}
		}
		function onHttpSuccess() {
			httpErrorsInRow = Math.max(0, httpErrorsInRow - 1);
		}

		const worker = new BullWorker(
			"organizationsQueue",
			async (job: Job) => {
				const jobStart = Date.now();
				const {
					organizations = [],
					type = "organizations",
					listId,
				} = job.data as {
					organizations: any[];
					type?: string;
					listId?: number;
				};

				const seen = new Set<string>();
				const uniqueOrgs = organizations.filter((o) => {
					const key = (o.name || String(o.id) || "").trim().toLowerCase();
					if (seen.has(key)) return false;
					seen.add(key);
					return true;
				});

				if (type !== "organizations") {
					throw new Error(`[${workerId}] Invalid job type "${type}"`);
				}

				logger.info(
					`[${workerId}] START job ${job.id} at ${new Date(jobStart).toISOString()} — ${uniqueOrgs.length}/${organizations.length} orgs (after deduplication)`,
				);

				await waitForStrapi();
				await sleep(300);

				const newOrgs: any[] = [];
				const existingOrgIds: number[] = [];
				const updateOrgs: any[] = [];

				// 1) Cache-aware split
				for (const org of uniqueOrgs) {
					if (isOrganizationInCache(org)) {
						updateOrgs.push(org);
						const orgCache = relationCache.organizations;
						let cached: number | undefined;
						if (orgCache) {
							if (org.id != null) cached = orgCache.get(String(org.id));
							if (cached == null && org.name) {
								const ln = org.name.trim().toLowerCase();
								for (const [k, v] of orgCache)
									if (k.toLowerCase() === ln) {
										cached = v;
										break;
									}
							}
						}
						if (typeof cached === "number") {
							existingOrgIds.push(cached);
						} else {
							newOrgs.push(org);
							updateOrgs.pop();
						}
					} else {
						newOrgs.push(org);
					}
				}

				logger.info(
					`[${workerId}] Cache filter: ${newOrgs.length} new, ${updateOrgs.length} updated (${existingOrgIds.length} IDs found)`,
				);

				// 2) Prepare NEW → create
				const toCreate = sanitizeOrganizations(newOrgs);
				logger.info(JSON.stringify(toCreate, null, 2));
				const _cleaned = toCreate
					.map((o) => {
						const cleaned = cleanEmptyStringsToNull(o);
						return cleaned;
					})
					.map((o) => {
						const validated = validateEnumerations(o);
						return validated;
					});

				logger.info(
					`[${workerId}] ${toCreate.length}/${newOrgs.length} new orgs ready`,
				);

				const cleanedCreatePayload = toCreate
					.map(cleanEmptyStringsToNull)
					.map(validateEnumerations);

				const BULK_SIZE = 1000;
				const createdIds: number[] = [];
				let successCount = 0;

				if (cleanedCreatePayload.length === 0) {
					logger.warn(`[${workerId}] No new orgs to bulk-create; skipping`);
				}

				for (
					let offset = 0;
					offset < cleanedCreatePayload.length;
					offset += BULK_SIZE
				) {
					const batch = cleanedCreatePayload.slice(offset, offset + BULK_SIZE);
					const batchNum = Math.floor(offset / BULK_SIZE) + 1;

					const batchStart = Date.now();
					try {
						const body = await postWithRetry<{
							success: boolean;
							count: number;
							ids?: number[];
							message?: string;
						}>(
							ORG_CREATE_URL,
							{ entity: "organization", data: batch },
							{
								headers: {
									Authorization: `Bearer ${env.DAL_STRAPI_API_TOKEN}`,
									"Content-Type": "application/json",
								},
							},
						);

						if (!body.success) {
							throw new Error(
								`Strapi bulk-create failed: ${body.message || "unknown error"}`,
							);
						}

						const ids = Array.isArray(body.ids) ? body.ids : [];
						const cacheMap =
							relationCache.organizations || new Map<string, number>();
						for (let i = 0; i < ids.length && i < batch.length; i++) {
							const key = String(newOrgs[offset + i]?.id || ids[i]);
							if (key && !cacheMap.has(key)) {
								cacheMap.set(key, ids[i]);
							}
						}
						relationCache.organizations = cacheMap;

						for (const id of ids) {
							createdIds.push(id);
							successCount++;
						}

						const dur = Date.now() - batchStart;
						recordResponseTime(dur, false);
						onHttpSuccess();
						logger.info(
							`[${workerId}] → created ${ids.length} items, time=${dur}ms`,
						);
					} catch (err: any) {
						const dur = Date.now() - batchStart;
						recordResponseTime(dur, true);
						onHttpError();
						logger.error(
							`[${workerId}] Bulk-create failed at batch #${batchNum}: ${err.message}`,
						);
						throw err;
					}

					await sleep(jitter(BATCH_COOLDOWN_BASE));
				}

				if (updateOrgs.length) {
					const toUpdate = sanitizeOrganizations(updateOrgs)
						.map(cleanEmptyStringsToNull)
						.map((o) => {
							if (!validateEnumerations(o)) {
								throw new Error("Enumeration validation failed");
							}
							return o;
						})
						.map((o, i) => {
							const id = existingOrgIds[i] ?? updateOrgs[i]?.id;
							if (typeof id !== "number") {
								logger.warn(
									`[${workerId}] fallback failed: no numeric id for update idx=${i}`,
									{ org: updateOrgs[i] },
								);
								throw new Error("Missing id for update");
							}
							return { id, ...o };
						});

					const UPDATED_BATCH = 1000;
					let updatedCount = 0;

					for (let off = 0; off < toUpdate.length; off += UPDATED_BATCH) {
						const batch = toUpdate.slice(off, off + UPDATED_BATCH);
						const batchNum = Math.floor(off / UPDATED_BATCH) + 1;

						const start = Date.now();
						try {
							const body = await postWithRetry<{
								success: boolean;
								count: number;
								message?: string;
							}>(
								ORG_UPDATE_URL,
								{ entity: "organization", data: batch },
								{
									headers: {
										Authorization: `Bearer ${env.DAL_STRAPI_API_TOKEN}`,
										"Content-Type": "application/json",
									},
								},
							);

							if (!body.success) {
								throw new Error(
									`Strapi bulk-update failed: ${body.message || "unknown error"}`,
								);
							}

							updatedCount += body.count;
							recordResponseTime(Date.now() - start, false);
							onHttpSuccess();
							logger.info(
								`[${workerId}] → updated ${body.count} items, time=${Date.now() - start}ms`,
							);
						} catch (err: any) {
							recordResponseTime(Date.now() - start, true);
							onHttpError();
							logger.error(
								`[${workerId}] Bulk-update failed at batch #${batchNum}: ${err.message}`,
							);
							throw err;
						}
						await sleep(jitter(BATCH_COOLDOWN_BASE));
					}

					logger.info(
						`[${workerId}] Updated total ${updatedCount} existing organizations`,
					);
				}

				const total = Date.now() - jobStart;
				logger.info(
					`[${workerId}] DONE job ${job.id} — success=${successCount}, updated=${updateOrgs.length}, total_appended=${existingOrgIds.length + createdIds.length}, totalTime=${total}ms`,
				);

				const fullOrgs = buildFullOrgsArray(
					uniqueOrgs,
					updateOrgs,
					existingOrgIds,
					newOrgs,
					createdIds,
				);

				await orgRelationsQueue.add("ensureRelations", {
					organizations: fullOrgs,
					listId,
				});

				if (updateOrgs.length) {
					const updatedIdsSet = new Set(existingOrgIds);
					const updatedFullOrgs = fullOrgs.filter((o) =>
						updatedIdsSet.has(o.id),
					);

					await orgRelationsQueue.add("replaceOrgRelations", {
						organizations: updatedFullOrgs,
						listId,
					});
				}

				return {
					successCount,
					ids: createdIds,
					updateCount: updateOrgs.length,
					existingIds: existingOrgIds,
					totalAppended: existingOrgIds.length + createdIds.length,
				};
			},
			{
				connection: { host: env.DAL_REDIS_HOST, port: env.DAL_REDIS_PORT },
				concurrency: env.DAL_JOB_CONCURRENCY,
				lockDuration: 600000,
			},
		);

		worker.on("completed", (job) =>
			logger.info(`[${workerId}] COMPLETED job ${job.id}`),
		);
		worker.on("failed", (job, err) =>
			logger.error(
				`[${workerId}] FAILED job ${job?.id}: ${(err as Error).message}`,
			),
		);

		logger.info(`[${workerId}] Worker started`);
	}
};
