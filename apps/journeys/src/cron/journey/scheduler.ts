import cron from "node-cron";
import { CRON_EXPRESSION } from "../../config";
import { scheduleJourneys } from "../../jobs/schedule-journeys";
import { cleanupOrphanedRedisKeys } from "../../jobs/cleanup-redis-keys";
import { env } from "../../common/utils/env-config";
import { logger } from "../../logger";

export function startJourneyScheduler() {
	// Schedule journey processing
	cron.schedule(CRON_EXPRESSION, scheduleJourneys);
	logger.info(`Journey scheduler started with cron: ${CRON_EXPRESSION}`);
	
	// Schedule Redis cleanup job
	cron.schedule(env.REDIS_CLEANUP_CRON, cleanupOrphanedRedisKeys);
	logger.info(`Redis cleanup scheduler started with cron: ${env.REDIS_CLEANUP_CRON}`);
}
