import http from "node:http";
import https from "node:https";
import type { DocumentId } from "@nowcrm/services";
import { Worker as BullWorker, type Job } from "bullmq";
import pLimit from "p-limit";
import { pino } from "pino";
// orgsWorker.ts
import { env } from "@/common/utils/env-config";
import { fetchJson } from "@/common/utils/fetch-json";
import { orgRelationsQueue } from "@/jobs_pipeline/common/relation/orgs/relation-worker-org";
import { relationCache } from "../contacts/processors/helpers/cache";
import { waitForStrapi } from "../contacts/processors/helpers/check-strapi";
import { cleanEmptyStringsToNull } from "./processors/organizations/clean";
import { validateEnumerations } from "./processors/organizations/enumerations";
import { getCachedOrganizationId } from "./processors/organizations/iscache";
import { sanitizeOrganizations } from "./processors/organizations/sanitize";

function buildFullOrgsArray(
	originalOrgs: any[],
	updateOrgs: any[],
	existingOrgIds: DocumentId[],
	newOrgs: any[],
	createdIds: DocumentId[],
): Array<any & { documentId: DocumentId }> {
	const full: Array<any & { documentId: DocumentId }> = [];
	let newIdx = 0;
	let existingIdx = 0;

	for (const org of originalOrgs) {
		if (updateOrgs.includes(org)) {
			full.push({ ...org, documentId: existingOrgIds[existingIdx++] });
		} else {
			full.push({ ...newOrgs[newIdx], documentId: createdIds[newIdx] });
			newIdx++;
		}
	}
	return full;
}

const _httpAgent = new http.Agent({
	keepAlive: true,
	maxSockets: 100,
	maxTotalSockets: 200,
});

const _httpsAgent = new https.Agent({
	keepAlive: true,
	maxSockets: 100,
	maxTotalSockets: 200,
});

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
const jitter = (baseMs: number, factor = 0.3) =>
	Math.floor(baseMs * (1 - factor + Math.random() * factor * 2));

// concurrency limiter
let httpConcurrency = 5;
let httpLimit = pLimit(httpConcurrency);
function reinitHttpLimiter(newConc: number) {
	httpConcurrency = newConc;
	httpLimit = pLimit(httpConcurrency);
}

// retryable POST
async function postWithRetry<T>(
	url: string,
	data: any,
	headers: Record<string, string>,
	attempts = 5,
): Promise<T> {
	let delay = 500;
	for (let i = 1; i <= attempts; i++) {
		try {
			return await httpLimit(async () =>
				fetchJson<T>(`${env.DAL_STRAPI_API_URL}${url}`, {
					method: "POST",
					headers,
					body: JSON.stringify(data),
				}),
			);
		} catch (err: any) {
			const msg = err?.message || "";
			const retriable =
				msg.includes("ECONNRESET") ||
				msg.includes("EPIPE") ||
				msg.includes("ETIMEDOUT") ||
				msg.includes("socket hang up") ||
				msg.includes("network timeout");
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
				`[${workerId}] Circuit breaker: ${reason}, pausing ${circuitRecoveryTime}ms`,
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
				`[${workerId}] Circuit restored. Concurrency=${concurrency}, httpConc=${httpConcurrency}`,
			);
		}

		function adjustConcurrency() {
			const avg =
				responseTimes.reduce((s, t) => s + t, 0) / responseTimes.length;
			if (avg > CIRCUIT_BREAK_THRESHOLD) {
				void triggerCircuitBreaker(`avg response ${avg.toFixed(0)}ms`);
			} else if (avg < RAMP_UP_THRESHOLD && concurrency < MAX_CONCURRENCY) {
				concurrency += avg < RAMP_UP_THRESHOLD / 2 ? 2 : 1;
				concurrency = Math.min(concurrency, MAX_CONCURRENCY);
				reinitLimiter();
				logger.info(
					`[${workerId}] Concurrency ↑ ${concurrency} (avg=${avg.toFixed(0)}ms)`,
				);
			} else if (avg > RAMP_DOWN_THRESHOLD && concurrency > MIN_CONCURRENCY) {
				concurrency--;
				reinitLimiter();
				logger.info(
					`[${workerId}] Concurrency ↓ ${concurrency} (avg=${avg.toFixed(0)}ms)`,
				);
			}

			if (avg < RAMP_UP_THRESHOLD && httpConcurrency < 20) {
				reinitHttpLimiter(httpConcurrency + 1);
			} else if (avg > RAMP_DOWN_THRESHOLD && httpConcurrency > 2) {
				reinitHttpLimiter(httpConcurrency - 1);
			}
		}

		function recordResponseTime(dur: number, isError = false) {
			responseTimes.push(dur);
			if (responseTimes.length > RESPONSE_WINDOW) responseTimes.shift();
			if (isError) {
				consecutiveErrors++;
				if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS)
					void triggerCircuitBreaker("too many errors");
			} else consecutiveErrors = Math.max(0, consecutiveErrors - 0.5);
			if (responseTimes.length >= Math.min(5, RESPONSE_WINDOW))
				adjustConcurrency();
		}

		function onHttpError() {
			httpErrorsInRow++;
			if (httpErrorsInRow >= 5)
				void triggerCircuitBreaker("[HTTP] too many socket resets");
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
					`[${workerId}] START job ${job.id} (${uniqueOrgs.length}/${organizations.length} orgs after dedup)`,
				);

				await waitForStrapi();
				await sleep(300);

				const newOrgs: any[] = [];
				const existingOrgIds: DocumentId[] = [];
				const updateOrgs: any[] = [];

				for (const org of uniqueOrgs) {
					const cached = getCachedOrganizationId(org);
					if (cached.documentId) {
						updateOrgs.push(org);
						existingOrgIds.push(cached.documentId);
					} else {
						newOrgs.push(org);
					}
				}
				logger.info(
					`[${workerId}] Cache filter: ${newOrgs.length} new, ${updateOrgs.length} updated`,
				);

				const toCreate = sanitizeOrganizations(newOrgs)
					.map(cleanEmptyStringsToNull)
					.map(validateEnumerations);
				const BULK_SIZE = 1000;
				const createdIds: DocumentId[] = [];
				let successCount = 0;

				if (toCreate.length === 0)
					logger.warn(`[${workerId}] No new orgs to bulk-create; skipping`);

				for (let offset = 0; offset < toCreate.length; offset += BULK_SIZE) {
					const batch = toCreate.slice(offset, offset + BULK_SIZE);
					const batchNum = Math.floor(offset / BULK_SIZE) + 1;
					const batchStart = Date.now();

					try {
						const body = await postWithRetry<{
							success: boolean;
							count: number;
							ids?: Array<{ documentId: DocumentId }>;
							message?: string;
						}>(
							ORG_CREATE_URL,
							{ entity: "organization", data: batch },
							{
								Authorization: `Bearer ${env.DAL_STRAPI_API_TOKEN}`,
								"Content-Type": "application/json",
							},
						);

						if (!body.success)
							throw new Error(`Strapi bulk-create failed: ${body.message}`);
						const docs = Array.isArray(body.ids) ? body.ids : [];
						const ids = docs.map((d) => d.documentId);
						const cacheMap =
							relationCache.organizations ||
							new Map<
								string,
								{ id: number | null; documentId: DocumentId | null }
							>();

						for (let i = 0; i < ids.length && i < batch.length; i++) {
							const name = (batch[i].name || "").trim().toLowerCase();
							if (name && !cacheMap.has(name)) {
								cacheMap.set(name, { id: null, documentId: ids[i] });
							}
						}
						relationCache.organizations = cacheMap;

						createdIds.push(...ids);
						successCount += ids.length;
						recordResponseTime(Date.now() - batchStart, false);
						onHttpSuccess();
						logger.info(
							`[${workerId}] → created ${ids.length}, time=${Date.now() - batchStart}ms`,
						);
					} catch (err: any) {
						recordResponseTime(Date.now() - batchStart, true);
						onHttpError();
						logger.error(
							`[${workerId}] Bulk-create failed batch #${batchNum}: ${err.message}`,
						);
						throw err;
					}
					await sleep(jitter(BATCH_COOLDOWN_BASE));
				}

				if (updateOrgs.length) {
					const toUpdate = sanitizeOrganizations(updateOrgs)
						.map(cleanEmptyStringsToNull)
						.map(validateEnumerations)
						.map((o, i) => ({
							documentId: existingOrgIds[i] ?? updateOrgs[i]?.id,
							...o,
						}));

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
									Authorization: `Bearer ${env.DAL_STRAPI_API_TOKEN}`,
									"Content-Type": "application/json",
								},
							);
							if (!body.success)
								throw new Error(`Strapi bulk-update failed: ${body.message}`);
							updatedCount += body.count;
							recordResponseTime(Date.now() - start, false);
							onHttpSuccess();
							logger.info(
								`[${workerId}] → updated ${body.count}, time=${Date.now() - start}ms`,
							);
						} catch (err: any) {
							recordResponseTime(Date.now() - start, true);
							onHttpError();
							logger.error(
								`[${workerId}] Bulk-update failed batch #${batchNum}: ${err.message}`,
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
				logger.info(`[${workerId}] DONE job ${job.id}, totalTime=${total}ms`);

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
					const updatedFullOrgs = fullOrgs.filter((o) =>
						updateOrgs.includes(
							organizations.find((org) => org === o || org.name === o.name),
						),
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
