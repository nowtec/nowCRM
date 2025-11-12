import { Worker as BullWorker } from "bullmq";
import { pino } from "pino";
import { env } from "@/common/utils/env-config";
import { exportEntityItems } from "./processors/export";

export const startExportWorker = () => {
	for (let i = 0; i < env.DAL_WORKER_COUNT; i++) {
		const workerId = `ExportWorker-${i + 1}`;
		const logger = pino({
			name: "exportWorker",
			transport: { target: "pino-pretty" },
		});

		const worker = new BullWorker(
			"exportQueue",
			async (job) => {
				logger.info(`[${workerId}] START job ${job.id}`);

				const { entity, searchMask, userEmail } = job.data;

				const result = await exportEntityItems(entity, searchMask, userEmail);

				logger.info(
					`[${workerId}] DONE job ${job.id} — Exported: ${result.exportedCount}, Failed: ${result.failedCount}, File: ${result.filePath}`,
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
