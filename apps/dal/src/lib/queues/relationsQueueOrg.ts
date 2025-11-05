import { Queue } from "bullmq";
import { env } from "@/common/utils/env-config";

export const orgRelationsQueue = new Queue("orgRelationsQueue", {
	connection: {
		host: env.DAL_REDIS_HOST,
		port: env.DAL_REDIS_PORT,
	},
});
