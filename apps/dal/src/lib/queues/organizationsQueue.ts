import { Queue } from "bullmq";
import { env } from "@/common/utils/env-config";

const redisConnection = {
	host: env.DAL_REDIS_HOST,
	port: env.DAL_REDIS_PORT,
};

export const organizationsQueue = new Queue("organizationsQueue", {
	connection: redisConnection,
});
