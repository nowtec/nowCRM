import cron from "node-cron";
import { env } from "../../common/utils/env-config";
import { CRON_EXPRESSION } from "../../config";
import { cleanupOrphanedRedisKeys } from "../../jobs/cleanup-redis-keys";
import { scheduleJourneys } from "../../jobs/schedule-journeys";
import { logger } from "../../logger";

export function startJourneyScheduler() {
	try {
		// Schedule journey processing
		cron.schedule(CRON_EXPRESSION, scheduleJourneys);
		logger.info(`Journey scheduler started with cron: ${CRON_EXPRESSION}`);

		// Schedule Redis cleanup job
		const cleanupCron = env.REDIS_CLEANUP_CRON || "0 2 * * *"; // Fallback to daily at 2 AM
		if (cleanupCron) {
			cron.schedule(cleanupCron, cleanupOrphanedRedisKeys);
			logger.info(`Redis cleanup scheduler started with cron: ${cleanupCron}`);
		} else {
			logger.warn("REDIS_CLEANUP_CRON not set, skipping cleanup scheduler");
		}
	} catch (err) {
		logger.error(
			{
				err,
				cronExpression: CRON_EXPRESSION,
				cleanupCron: env.REDIS_CLEANUP_CRON,
			},
			"Failed to start cron schedulers",
		);
		throw err;
	}
}
