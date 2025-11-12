import { Worker as BullWorker } from "bullmq";
import { pino } from "pino";
import { env } from "@/common/utils/env-config";
import { deleteEntityItems } from "./processors/delete";

export const startDeletionWorker = () => {
	for (let i = 0; i < env.DAL_WORKER_COUNT; i++) {
		const workerId = `DeleteWorker-${i + 1}`;
		const logger = pino({
			name: "deleteWorker",
			transport: { target: "pino-pretty" },
		});

		const worker = new BullWorker(
			"deletionQueue",
			async (job) => {
				logger.info(`[${workerId}] START job ${job.id}`);
				const { entity, items } = job.data;

				const result = await deleteEntityItems(entity, items);

				logger.info(
					`[${workerId}] DONE job ${job.id} — Deleted: ${result.deletedCount}, Failed: ${result.failedCount}`,
				);
				return result;
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
