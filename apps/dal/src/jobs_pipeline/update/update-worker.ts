import { Worker as BullWorker } from "bullmq";
import { pino } from "pino";
import { env } from "@/common/utils/env-config";
import { updateEntityItems } from "./update";

export const startUpdateWorker = () => {
	for (let i = 0; i < env.DAL_WORKER_COUNT; i++) {
		const workerId = `UpdateWorker-${i + 1}`;
		const logger = pino({
			name: "updateWorker",
			transport: { target: "pino-pretty" },
		});

		const worker = new BullWorker(
			"updateQueue",
			async (job) => {
				logger.info(`[${workerId}] START job ${job.id}`);

				const { entity, items } = job.data;

				if (!Array.isArray(items) || items.length === 0) {
					logger.warn(
						`[${workerId}] Job ${job.id} received no items to update`,
					);
					return {
						bulkUpdated: 0,
						relationsUpdated: 0,
						failed: 0,
						failedItems: [],
					};
				}

				logger.info(
					`[${workerId}] Job ${job.id} received ${items.length} "${entity}" items`,
				);
				logger.debug(
					`[${workerId}] Sample item[0]: ${JSON.stringify(items[0], null, 2)}`,
				);

				let result: any;
				try {
					result = await updateEntityItems(entity, items);
				} catch (err: any) {
					logger.error(
						`[${workerId}] Exception in updateEntityItems: ${err.message}`,
					);
					return {
						bulkUpdated: 0,
						relationsLinked: 0,
						failed: items.length,
						failedItems: items.map((it: any) => ({
							documentId: it?.documentId ?? "unknown",
							error: err.message,
						})),
					};
				}

				const { bulkUpdated, relationsLinked, failedItems } = result;
				const failedCount = failedItems.length;

				if (bulkUpdated === 0 && relationsLinked === 0 && failedCount > 0) {
					logger.warn(
						`[${workerId}] Job ${job.id} resulted in 0 updates and ${failedCount} failures`,
					);
				}

				const preview = failedItems
					.slice(0, 5)
					.map(
						({ documentId, error }: { documentId: string; error: string }) => ({
							documentId,
							error,
						}),
					);
				logger.info(
					`[${workerId}] DONE job ${job.id} — Bulk: ${bulkUpdated}, Relations: ${relationsLinked}, Failed: ${failedCount}, Sample errors: ${JSON.stringify(preview)}`,
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
