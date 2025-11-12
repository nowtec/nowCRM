import { Queue } from "bullmq";
import { env } from "@/common/utils/env-config";

const redisConnection = {
	host: env.DAL_REDIS_HOST,
	port: env.DAL_REDIS_PORT,
};

export const csvOrganizationsQueue = new Queue("csvOrganizationsQueue", {
	connection: redisConnection,
});
