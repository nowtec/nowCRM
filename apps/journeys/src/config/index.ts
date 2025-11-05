import { env } from "@/common/utils/env-config";

export const JOURNEY_TIME_CHECK_SEC = Number(env.JOURNEYS_CHECK_TIME) || 1440;
export const COMPLETE_JOB_TTL_SEC =
	Number(env.JOURNEYS_JOB_COMPLETED_LIFE_TIME_DAYS) * 86400;
export const FAIL_JOB_TTL_SEC =
	Number(env.JOURNEYS_JOB_FAIL_LIFE_TIME_DAYS) * 86400;
export const CHECK_JOB_TTL_SEC = 600;

export const CRON_EXPRESSION = `*/${env.JOURNEYS_MINUTE_TO_LAUNCH} * * * *`;

export const RABBITMQ_URL = env.RABBITMQ_URL;
export const EXCHANGE_NAME_JOURNEY = "journey_exchange";
export const EXCHANGE_TYPE = "x-delayed-message";

export const JOURNEY_QUEUES = {
	JOURNEY: "journeyQueue",
	JOB: "jobQueue",
	RULE_CHECK: "ruleCheckQueue",
	DELAYED: "delayedJobQueue",
};

export const EXCHANGE_NAME_TRIGGER = "journey_exchange";
export const TRIGGER_QUEUES = {
	TRIGGER: "triggerQueue",
};
