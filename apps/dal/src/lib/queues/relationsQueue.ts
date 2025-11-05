import { Queue } from "bullmq";
import { env } from "@/common/utils/env-config";

export const relationsQueue = new Queue("relationsQueue", {
	connection: {
		host: env.DAL_REDIS_HOST,
		port: env.DAL_REDIS_PORT,
	},
});
