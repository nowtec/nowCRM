import Redis from "ioredis";
import { env } from "@/common/utils/env-config";

const redis = new Redis({ host: env.DAL_REDIS_HOST, port: env.DAL_REDIS_PORT });

export async function initProgress(jobId: string, totalBatches: number) {
	await redis.set(`progress:${jobId}:total`, totalBatches);
	await redis.set(`progress:${jobId}:completed`, 0);
}

export async function incrementProgress(jobId: string) {
	await redis.incr(`progress:${jobId}:completed`);
}

export async function getProgress(jobId: string) {
	const [totalStr, completedStr] = await redis.mget(
		`progress:${jobId}:total`,
		`progress:${jobId}:completed`,
	);

	const total = Number.parseInt(totalStr || "0", 10);
	const completed = Number.parseInt(completedStr || "0", 10);
	const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

	return { jobId, total, completed, percent };
}
