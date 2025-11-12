import { Queue } from "bullmq";
import { env } from "@/common/utils/env-config";

export const exportQueue = new Queue("exportQueue", {
	connection: {
		host: env.DAL_REDIS_HOST,
		port: env.DAL_REDIS_PORT,
	},
});
