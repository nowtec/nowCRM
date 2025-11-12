import { Worker as BullWorker, type Job } from "bullmq";
import { pino } from "pino";
import { env } from "@/common/utils/env-config";
import { pool } from "@/jobs_pipeline/csv-import/contacts/processors/helpers/db";
import { SQL } from "@/jobs_pipeline/csv-import/sql/queries";

interface UpdateSubscriptionJobData {
	items: Array<number | { id: number }>;
	channelId: number;
	isSubscribe: boolean;
	addEvent?: boolean;
}

const pause = (ms: number) =>
	new Promise<void>((resolve) => setTimeout(resolve, ms));
const PAUSE_MS = 500; // 500 ms pause between jobs

export const startUpdateSubscriptionWorker = () => {
	for (let w = 0; w < env.DAL_WORKER_COUNT; w++) {
		const workerId = `UpdateSubscription-${w + 1}`;
		const logger = pino({
			name: "UpdateSubscription",
			transport: { target: "pino-pretty" },
		});

		const worker = new BullWorker<UpdateSubscriptionJobData>(
			"updateSubscriptionQueue",
			async (job: Job<UpdateSubscriptionJobData>) => {
				logger.info(
					`[${workerId}] ▶ START job ${job.id} — data=${JSON.stringify(job.data)}`,
				);

				const { items, channelId, isSubscribe } = job.data;
				if (!Array.isArray(items) || items.length === 0) {
					throw new Error("items must be a non-empty array");
				}
				if (channelId == null) {
					throw new Error("channelId is required");
				}
				if (typeof isSubscribe !== "boolean") {
					throw new Error("isSubscribe must be boolean");
				}

				// Normalize contact IDs
				const contactIds: number[] = items.map((it) => {
					if (typeof it === "number") return it;
					if (typeof it === "object" && it !== null && "id" in it) return it.id;
					throw new Error("Invalid item in items array");
				});

				// 1) Fetch the 'Basic' subscription type ID
				logger.info(`[${workerId}] Fetching 'Basic' subscription type ID`);
				const typeRes = await pool.query(SQL.SELECT_BASIC_TYPE_ID, ["Basic"]);
				if ((typeRes.rowCount ?? 0) === 0) {
					throw new Error("Subscription type 'Basic' not found");
				}
				const basicTypeId = typeRes.rows[0].id as number;

				const BATCH_SIZE = 100;
				let totalProcessed = 0;
				const totalBatches = Math.ceil(contactIds.length / BATCH_SIZE);

				for (let i = 0; i < contactIds.length; i += BATCH_SIZE) {
					const batchNumber = i / BATCH_SIZE + 1;
					const chunk = contactIds.slice(i, i + BATCH_SIZE);

					logger.info(
						`[${workerId}] Processing batch ${batchNumber}/${totalBatches} — ${chunk.length} contacts`,
					);

					if (isSubscribe) {
						// 2) Reactivate existing subscriptions (draft → publish)
						const reactRes = await pool.query(SQL.REACTIVATE_SUBSCRIPTIONS, [
							chunk,
							channelId,
						]);
						const reactivated = reactRes.rowCount ?? 0;

						// 3) Find which contacts still need new subscriptions
						const existRes = await pool.query(SQL.SELECT_EXISTING_CONTACT_IDS, [
							chunk,
							channelId,
						]);
						const existedIds = existRes.rows.map((r) => r.contact_id as number);

						// 4) Insert new subscriptions for the rest
						let inserted = 0;
						for (const contactId of chunk) {
							if (!existedIds.includes(contactId)) {
								const insSub = await pool.query(SQL.INSERT_SUBSCRIPTION, []);
								const subId = insSub.rows[0].id as number;

								await pool.query(SQL.LINK_TO_CONTACT, [subId, contactId]);
								await pool.query(SQL.LINK_TO_CHANNEL, [subId, channelId]);
								await pool.query(SQL.LINK_TO_TYPE, [subId, basicTypeId]);

								inserted++;
							}
						}

						totalProcessed += reactivated + inserted;
						logger.info(
							`[${workerId}] Subscribed batch ${batchNumber}: reactivated=${reactivated}, new=${inserted}`,
						);
					} else {
						// Unsubscribe path
						const unRes = await pool.query(SQL.DEACTIVATE_SUBSCRIPTIONS, [
							chunk,
							channelId,
						]);
						const deactivated = unRes.rowCount ?? 0;
						totalProcessed += deactivated;

						logger.info(
							`[${workerId}] Unsubscribed batch ${batchNumber}: deactivated=${deactivated}`,
						);

						if (job.data.addEvent) {
							try {
								logger.info(
									`[${workerId}] Creating unsubscribe events for ${chunk.length} contacts`,
								);

								for (const contactId of chunk) {
									const insertEvent = await pool.query(
										SQL.INSERT_UNSUBSCRIBE_EVENT,
										[
											"unsubscribe", // action
											"unsubscribed", // status
											"Unsubscribe", // source
											"", // destination
											"", // external_id
											"Unsubscribe event", // title
											"",
										],
									);
									const eventId = insertEvent.rows[0].id;

									await pool.query(SQL.LINK_EVENT_TO_CONTACT, [
										eventId,
										contactId,
									]);
									await pool.query(SQL.LINK_EVENT_TO_CHANNEL, [
										eventId,
										channelId,
									]);
								}

								logger.info(
									`[${workerId}] Created ${chunk.length} unsubscribe events`,
								);
							} catch (err) {
								logger.error(
									`[${workerId}] Failed to create unsubscribe events: ${
										err instanceof Error ? err.message : JSON.stringify(err)
									}`,
								);
							}
						}
					}
				}

				logger.info(
					`[${workerId}] DONE job ${job.id} — totalProcessed=${totalProcessed}`,
				);

				// Pause before allowing the next job to run
				logger.info(`[${workerId}] Pausing for ${PAUSE_MS} ms before next job`);
				await pause(PAUSE_MS);

				return { processed: totalProcessed };
			},
			{
				connection: {
					host: env.DAL_REDIS_HOST,
					port: env.DAL_REDIS_PORT,
				},
				concurrency: env.DAL_JOB_CONCURRENCY,
			},
		);

		worker.on("completed", (job) =>
			logger.info(`[${workerId}] ✔ COMPLETED job ${job.id}`),
		);
		worker.on("failed", (job, err) =>
			logger.error(`[${workerId}] ✖ FAILED job ${job?.id}: ${err.message}`),
		);

		logger.info(`[${workerId}] Worker started`);
	}
};
