import { Queue } from "bullmq";
import { env } from "@/common/utils/env-config";

export const addToListQueue = new Queue("addToListQueue", {
	connection: {
		host: env.DAL_REDIS_HOST,
		port: env.DAL_REDIS_PORT,
	},
});
