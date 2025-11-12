import { Queue } from "bullmq";
import { env } from "@/common/utils/env-config";

export const csvMassActionsQueue = new Queue("csvMassActionsQueue", {
	connection: {
		host: env.DAL_REDIS_HOST,
		port: env.DAL_REDIS_PORT,
	},
});
