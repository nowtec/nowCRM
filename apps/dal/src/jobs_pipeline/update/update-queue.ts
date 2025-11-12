import { Queue } from "bullmq";
import { env } from "@/common/utils/env-config";

export const updateQueue = new Queue("updateQueue", {
	connection: {
		host: env.DAL_REDIS_HOST,
		port: env.DAL_REDIS_PORT,
	},
});
