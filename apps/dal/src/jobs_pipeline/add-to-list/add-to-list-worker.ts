import { Worker as BullWorker } from "bullmq";
import { pino } from "pino";
import { env } from "@/common/utils/env-config";
import { pool } from "@/jobs_pipeline/csv-import/contacts/processors/helpers/db";

export const startAddToListWorker = () => {
	for (let i = 0; i < env.DAL_WORKER_COUNT; i++) {
		const workerId = `AddToListWorker-${i + 1}`;
		const logger = pino({
			name: "addToListWorker",
			transport: { target: "pino-pretty" },
		});

		const worker = new BullWorker(
			"addToListQueue",
			async (job) => {
				logger.info(`[${workerId}] START job ${job.id}`);
				const { items, listId } = job.data;

				if (!listId || typeof listId !== "number") {
					logger.error(`[${workerId}] Invalid or missing listId`);
					throw new Error("Missing listId in job data");
				}

				let contactIds: number[];

				if (
					Array.isArray(items) &&
					items.length > 0 &&
					typeof items[0] === "object"
				) {
					contactIds = items.map((item: { id: number }) => item.id);
				} else if (
					Array.isArray(items) &&
					items.every((i) => typeof i === "number")
				) {
					contactIds = items as number[];
				} else {
					logger.error(`[${workerId}] Invalid items array`);
					throw new Error("Missing or invalid items (contact IDs)");
				}

				const BATCH_SIZE = 100;
				let totalInserted = 0;
				let totalRetried = 0;

				for (let i = 0; i < contactIds.length; i += BATCH_SIZE) {
					const chunk = contactIds.slice(i, i + BATCH_SIZE);
					const placeholders = chunk
						.map((_, idx) => `($${idx * 2 + 1}, $${idx * 2 + 2})`)
						.join(",");
					const values = chunk.flatMap((id) => [id, listId]);

					try {
						const result = await pool.query(
							`INSERT INTO contacts_lists_lnk (contact_id, list_id)
				   VALUES ${placeholders}
				   ON CONFLICT DO NOTHING
				   RETURNING contact_id`,
							values,
						);

						const insertedIds = result.rows.map(
							(r: { contact_id: number }) => r.contact_id,
						);
						const skippedIds = chunk.filter((id) => !insertedIds.includes(id));
						totalInserted += insertedIds.length;

						if (skippedIds.length > 0) {
							logger.warn(
								`[${workerId}] Retrying ${skippedIds.length} skipped contacts...`,
							);

							await pool.query(
								"DELETE FROM contacts_lists_lnk WHERE contact_id = ANY($1::int[]) AND list_id = $2",
								[skippedIds, listId],
							);

							const retryPlaceholders = skippedIds
								.map((_, idx) => `($${idx * 2 + 1}, $${idx * 2 + 2})`)
								.join(",");
							const retryValues = skippedIds.flatMap((id) => [id, listId]);

							const retryResult = await pool.query(
								`INSERT INTO contacts_lists_lnk (contact_id, list_id)
							VALUES ${retryPlaceholders}
							ON CONFLICT DO NOTHING
							RETURNING contact_id`,
								retryValues,
							);

							const retriedCount = retryResult.rowCount ?? 0;
							totalInserted += retriedCount;
							totalRetried += retriedCount;

							if (retriedCount < skippedIds.length) {
								const stillSkipped = skippedIds.filter(
									(id) =>
										!retryResult.rows.find(
											(r: { contact_id: number }) => r.contact_id === id,
										),
								);
								logger.warn(
									`[${workerId}] Still failed to insert ${stillSkipped.length} contacts after retry: [${stillSkipped.join(
										", ",
									)}]`,
								);
							}
						}

						logger.info(
							`[${workerId}] Inserted ${insertedIds.length} new + retried ${totalRetried} → total=${totalInserted}`,
						);
					} catch (err: any) {
						logger.error(`[${workerId}] DB insert failed: ${err.message}`);
						throw err;
					}
				}

				logger.info(
					`[${workerId}] DONE job ${job.id} — inserted ${totalInserted} contacts for list ${listId}`,
				);

				return {
					updatedCount: totalInserted,
					retried: totalRetried,
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
		});

		logger.info(`[${workerId}] STARTED`);
	}
};
