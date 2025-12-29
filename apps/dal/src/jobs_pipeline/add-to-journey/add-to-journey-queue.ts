import { Queue } from "bullmq";
import { env } from "@/common/utils/env-config";
import { DEFAULT_JOB_OPTIONS } from "../common/helpers/default-options";

export const addToJourneyQueue = new Queue("addToJourneyQueue", {
	connection: {
		host: env.DAL_REDIS_HOST,
		port: env.DAL_REDIS_PORT,
	},
	defaultJobOptions: DEFAULT_JOB_OPTIONS,
});
