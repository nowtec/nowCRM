import { Worker as BullWorker } from "bullmq";
import { pino } from "pino";
import { env } from "@/common/utils/env-config";
import { pool } from "@/jobs_pipeline/csv-import/contacts/processors/helpers/db";

export const startAddToJourneyWorker = () => {
	for (let i = 0; i < env.DAL_WORKER_COUNT; i++) {
		const workerId = `AddToJourneyWorker-${i + 1}`;
		const logger = pino({
			name: "addToJourneyWorker",
			transport: { target: "pino-pretty" },
		});

		const worker = new BullWorker(
			"addToJourneyQueue",
			async (job) => {
				logger.info(`[${workerId}] START job ${job.id}`);
				logger.debug(`[${workerId}] Job data: ${JSON.stringify(job.data)}`);

				const { items, journeyStepId } = job.data;

				if (!journeyStepId || typeof journeyStepId !== "number") {
					logger.error(`[${workerId}] Invalid or missing journeyStepId`);
					throw new Error("Missing or invalid journeyStepId in job data");
				}

				let contactIds: number[];
				if (
					Array.isArray(items) &&
					items.length > 0 &&
					typeof items[0] === "object"
				) {
					contactIds = (items as { id: number }[]).map((item) => item.id);
				} else if (
					Array.isArray(items) &&
					items.every((i) => typeof i === "number")
				) {
					contactIds = items as number[];
				} else {
					logger.error(
						`[${workerId}] Invalid items array: ${JSON.stringify(items)}`,
					);
					throw new Error("Missing or invalid items (contact IDs)");
				}

				logger.debug(
					`[${workerId}] Parsed contactIds: ${JSON.stringify(contactIds)}`,
				);

				const BATCH_SIZE = 1000;
				let totalInserted = 0;

				for (let i = 0; i < contactIds.length; i += BATCH_SIZE) {
					const chunk = contactIds.slice(i, i + BATCH_SIZE);
					try {
						await pool.query(
							`DELETE FROM contacts_journey_steps_lnk
							  WHERE contact_id = ANY($1::int[]) AND journey_step_id = $2`,
							[chunk, journeyStepId],
						);

						const placeholders = chunk
							.map((_, idx) => `($${idx * 2 + 1}, $${idx * 2 + 2})`)
							.join(",");

						const values = chunk.flatMap((contactId) => [
							journeyStepId,
							contactId,
						]);

						const res = await pool.query(
							`INSERT INTO contacts_journey_steps_lnk (journey_step_id, contact_id)
							 VALUES ${placeholders}
							 RETURNING contact_id`,
							values,
						);

						const insertedIds = res.rows.map(
							(row: { contact_id: number }) => row.contact_id,
						);
						const _skippedIds = chunk.filter((id) => !insertedIds.includes(id));

						totalInserted += insertedIds.length;

						logger.info(
							`[${workerId}] Replaced batch: inserted=${insertedIds.length}, totalInserted=${totalInserted}`,
						);
					} catch (err: any) {
						logger.error(
							`[${workerId}] DB replace failed: ${err.message}\n${err.stack}`,
						);
						throw err;
					}
				}

				logger.info(
					`[${workerId}] DONE job ${job.id} — connected ${totalInserted} contacts to journey step ${journeyStepId}`,
				);

				return {
					updatedCount: totalInserted,
					failedCount: 0,
				};
			},
			{
				connection: {
					host: env.DAL_REDIS_HOST,
					port: env.DAL_REDIS_PORT,
				},
				concurrency: env.DAL_JOB_CONCURRENCY,
			},
		);

		worker.on("completed", (job) => {
			logger.info(`[${workerId}] COMPLETED job ${job.id}`);
		});

		worker.on("failed", (job, err) => {
			logger.error(`[${workerId}] FAILED job ${job?.id}: ${err.message}`);
			if (err.stack) logger.error(err.stack);
		});

		logger.info(`[${workerId}] STARTED`);
	}
};
