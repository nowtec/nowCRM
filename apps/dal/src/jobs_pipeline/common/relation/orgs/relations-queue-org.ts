import { Queue } from "bullmq";
import { env } from "@/common/utils/env-config";
import { DEFAULT_JOB_OPTIONS } from "../../helpers/default-options";

export const orgRelationsQueue = new Queue("orgRelationsQueue", {
	connection: {
		host: env.DAL_REDIS_HOST,
		port: env.DAL_REDIS_PORT,
	},
	defaultJobOptions: DEFAULT_JOB_OPTIONS,
});
