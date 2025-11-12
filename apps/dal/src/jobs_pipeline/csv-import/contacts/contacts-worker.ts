import http from "node:http";
import https from "node:https";
import type { DocumentId } from "@nowcrm/services";
import { Worker as BullWorker, type Job } from "bullmq";
import pLimit from "p-limit";
import { pino } from "pino";
// contactWorker.ts
import { env } from "@/common/utils/env-config";
import { fetchJson } from "@/common/utils/fetch-json";
import { relationsQueue } from "@/jobs_pipeline/common/relation/contacts/relation-worker";
import { cleanEmptyStringsToNull } from "./processors/contacts/clean";
import { formatDateTimeFields } from "./processors/contacts/dates";
import { validateEnumerations } from "./processors/contacts/enumerations";
import { validateIntegerFields } from "./processors/contacts/integer";
import { getCachedContactId } from "./processors/contacts/iscache";
import { sanitizeContacts } from "./processors/contacts/sanitize";
import { relationCache } from "./processors/helpers/cache";
import { waitForStrapi } from "./processors/helpers/check-strapi";

function buildFullContactsArray(
	originalContacts: any[],
	updateContacts: any[],
	existingContactIds: DocumentId[],
	newContacts: any[],
	createdIds: DocumentId[],
): Array<any & { documentId: DocumentId }> {
	const full: Array<any & { documentId: DocumentId }> = [];
	let newIdx = 0;
	let existingIdx = 0;

	for (const contact of originalContacts) {
		if (updateContacts.includes(contact)) {
			full.push({ ...contact, documentId: existingContactIds[existingIdx++] });
		} else {
			full.push({ ...newContacts[newIdx], documentId: createdIds[newIdx] });
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

let httpConcurrency = 5;
let httpLimit = pLimit(httpConcurrency);
function reinitHttpLimiter(newConc: number) {
	httpConcurrency = newConc;
	httpLimit = pLimit(httpConcurrency);
}

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
				fetchJson<T>(`${env.STRAPI_URL}${url}`, {
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

export const startContactsWorkers = () => {
	for (let i = 0; i < env.DAL_WORKER_COUNT; i++) {
		const workerId = `Worker-${i + 1}`;

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
				responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length;
			if (avg > CIRCUIT_BREAK_THRESHOLD) {
				void triggerCircuitBreaker(`avg response ${avg.toFixed(0)}ms`);
			} else if (avg < RAMP_UP_THRESHOLD && concurrency < MAX_CONCURRENCY) {
				concurrency += avg < RAMP_UP_THRESHOLD / 2 ? 2 : 1;
				concurrency = Math.min(concurrency, MAX_CONCURRENCY);
				reinitLimiter();
				logger.info(
					`[${workerId}] Concurrency up to ${concurrency} (avg=${avg.toFixed(0)}ms)`,
				);
			} else if (avg > RAMP_DOWN_THRESHOLD && concurrency > MIN_CONCURRENCY) {
				concurrency--;
				reinitLimiter();
				logger.info(
					`[${workerId}] Concurrency down to ${concurrency} (avg=${avg.toFixed(0)}ms)`,
				);
			}

			if (avg < RAMP_UP_THRESHOLD && httpConcurrency < 20) {
				reinitHttpLimiter(httpConcurrency + 1);
				logger.info(
					`[${workerId}] HTTP concurrency up to ${httpConcurrency} (avg=${avg.toFixed(0)}ms)`,
				);
			} else if (avg > RAMP_DOWN_THRESHOLD && httpConcurrency > 2) {
				reinitHttpLimiter(httpConcurrency - 1);
				logger.info(
					`[${workerId}] HTTP concurrency down to ${httpConcurrency} (avg=${avg.toFixed(0)}ms)`,
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
			"contactsQueue",
			async (job: Job) => {
				const jobStart = Date.now();
				const {
					contacts = [],
					type = "contacts",
					listId,
					subscribeAll = false,
				} = job.data as {
					contacts: any[];
					type?: string;
					filename?: string;
					listId?: number;
					subscribeAll?: boolean;
				};

				if (type !== "contacts") {
					throw new Error(`[${workerId}] Invalid job type "${type}"`);
				}

				logger.info(
					`[${workerId}] START job ${job.id} at ${new Date(jobStart).toISOString()} - ${contacts.length} contacts`,
				);

				await waitForStrapi();
				await sleep(300);

				const newContacts: any[] = [];
				const existingContactIds: DocumentId[] = [];
				const updateContacts: any[] = [];

				for (const contact of contacts) {
					const cached = getCachedContactId(contact);
					if (cached.documentId) {
						updateContacts.push(contact);
						existingContactIds.push(cached.documentId);
					} else {
						newContacts.push(contact);
					}
				}

				logger.info(
					`[${workerId}] Cache filter: ${newContacts.length} new, ${updateContacts.length} updated (${existingContactIds.length} IDs found)`,
				);

				const toCreate = sanitizeContacts(newContacts);
				logger.info(
					`[${workerId}] ${toCreate.length}/${newContacts.length} new contacts ready`,
				);

				const _cleaned = toCreate
					.map(cleanEmptyStringsToNull)
					.map(formatDateTimeFields)
					.map(validateEnumerations)
					.map(validateIntegerFields);

				if (toCreate.length === 0) {
					logger.warn(`[${workerId}] No new contacts to bulk-create; skipping`);
				}

				const BULK_SIZE = 1000;
				const createdIds: DocumentId[] = [];
				let successCount = 0;

				for (let offset = 0; offset < toCreate.length; offset += BULK_SIZE) {
					const batch = toCreate.slice(offset, offset + BULK_SIZE);
					const batchNum = Math.floor(offset / BULK_SIZE) + 1;
					logger.info(
						`[${workerId}] Bulk-create batch #${batchNum} (${batch.length})`,
					);

					const batchStart = Date.now();
					try {
						const body = await postWithRetry<{
							success: boolean;
							count: number;
							ids?: Array<{ documentId: DocumentId }>;
							message?: string;
						}>(
							"/api/contacts/bulk-create",
							{ data: batch },
							{
								Authorization: `Bearer ${env.DAL_STRAPI_API_TOKEN}`,
								"Content-Type": "application/json",
							},
						);

						if (!body.success) {
							throw new Error(
								`Strapi bulk-create failed: ${body.message || "unknown error"}`,
							);
						}

						const docs = Array.isArray(body.ids) ? body.ids : [];
						const ids = docs.map((d) => d.documentId);
						const cacheMap =
							relationCache.contacts || new Map<string, number>();
						for (let i = 0; i < ids.length && i < batch.length; i++) {
							const email = (batch[i].email || "").trim();
							if (email && !cacheMap.has(email)) {
								cacheMap.set(email, { id: null, documentId: ids[i] });
							}
						}
						relationCache.contacts = cacheMap;

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

				const total = Date.now() - jobStart;
				logger.info(
					`[${workerId}] DONE job ${job.id} - success=${successCount}, updated=${updateContacts.length}, total_appended=${existingContactIds.length + createdIds.length}, totalTime=${total}ms`,
				);

				const fullContacts = buildFullContactsArray(
					contacts,
					updateContacts,
					existingContactIds,
					newContacts,
					createdIds,
				);
				if (updateContacts.length) {
					const toUpdate = sanitizeContacts(updateContacts)
						.map(cleanEmptyStringsToNull)
						.map(formatDateTimeFields)
						.map((c) => {
							if (!validateEnumerations(c)) {
								throw new Error("Enumeration validation failed");
							}
							if (!validateIntegerFields(c)) {
								throw new Error("Integer validation failed");
							}
							return c;
						})
						.map((c, i) => ({ documentId: existingContactIds[i], ...c }));

					const UPDATED_BATCH = 1000;
					let updatedCount = 0;

					for (let off = 0; off < toUpdate.length; off += UPDATED_BATCH) {
						const batch = toUpdate.slice(off, off + UPDATED_BATCH);
						const batchNum = Math.floor(off / UPDATED_BATCH) + 1;
						logger.info(
							`[${workerId}] Bulk-update batch #${batchNum} (${batch.length})`,
						);

						const start = Date.now();
						try {
							const body = await postWithRetry<{
								success: boolean;
								count: number;
								message?: string;
							}>(
								"/api/contacts/bulk-update",
								{ data: batch },
								{
									Authorization: `Bearer ${env.DAL_STRAPI_API_TOKEN}`,
									"Content-Type": "application/json",
								},
							);

							if (!body.success) {
								throw new Error(`Strapi bulk-update failed: ${body.message}`);
							}

							updatedCount += body.count;
							recordResponseTime(Date.now() - start, false);
							logger.info(
								`[${workerId}] → updated ${body.count} items, time=${Date.now() - start}ms`,
							);
						} catch (err: any) {
							recordResponseTime(Date.now() - start, true);
							logger.error(
								`[${workerId}] Bulk-update failed at batch #${batchNum}: ${err.message}`,
							);
							throw err;
						}
						await sleep(jitter(BATCH_COOLDOWN_BASE));
					}

					logger.info(
						`[${workerId}] Updated total ${updatedCount} existing contacts`,
					);
				}
				await relationsQueue.add("ensureRelations", {
					contacts: fullContacts,
					listId,
					subscribeAll,
				});

				if (updateContacts.length) {
					const updatedFullContacts = fullContacts.filter((fc) =>
						updateContacts.includes(
							contacts.find((c) => c === fc || c.email === fc.email),
						),
					);

					await relationsQueue.add("replaceRelations", {
						contacts: updatedFullContacts,
						listId,
					});
				}

				return {
					successCount,
					ids: createdIds,
					updateCount: updateContacts.length,
					existingIds: existingContactIds,
					totalAppended: existingContactIds.length + createdIds.length,
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
