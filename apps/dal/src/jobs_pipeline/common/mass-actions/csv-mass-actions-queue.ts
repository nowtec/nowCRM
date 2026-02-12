import { Queue } from "bullmq";
import { env } from "@/common/utils/env-config";
import { MASS_JOB_OPTIONS } from "../helpers/default-options";

export const csvMassActionsQueue = new Queue("csvMassActionsQueue", {
	connection: {
		host: env.DAL_REDIS_HOST,
		port: env.DAL_REDIS_PORT,
	},
	defaultJobOptions: MASS_JOB_OPTIONS,
});
