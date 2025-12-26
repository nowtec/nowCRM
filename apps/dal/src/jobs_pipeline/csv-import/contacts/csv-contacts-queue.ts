import { Queue } from "bullmq";
import { env } from "@/common/utils/env-config";
import { DEFAULT_JOB_OPTIONS } from "@/jobs_pipeline/common/helpers/default-options";

const redisConnection = {
	host: env.DAL_REDIS_HOST,
	port: env.DAL_REDIS_PORT,
};

export const csvContactsQueue = new Queue("csvContactsQueue", {
	connection: redisConnection,
	defaultJobOptions: DEFAULT_JOB_OPTIONS,
});
