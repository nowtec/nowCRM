import { JOURNEY_TIME_CHECK_SEC } from "../config";
import { withLock } from "../lib/functions/helpers/distributed-lock";
import { fetchActiveJourneys } from "../lib/functions/helpers/fetch-active-journeys";
import { logger } from "../logger";
import { publishToJourneyQueue } from "../rabbitmq";
import { redis } from "../redis";

const SCHEDULER_LOCK_KEY = "journey-scheduler:lock";
const SCHEDULER_LOCK_TTL = 300; // 5 minutes - should be longer than cron execution time

export async function scheduleJourneys() {
	// Use distributed lock to prevent concurrent execution across multiple instances
	const result = await withLock(
		SCHEDULER_LOCK_KEY,
		async () => {
			logger.info("Scheduling journey processing jobs...");
			const activeJourneys = await fetchActiveJourneys();
			const now = Date.now();

			for (const journey of activeJourneys) {
				const redisKey = `journey-job:${journey.documentId}`;

				// Use atomic check-and-set to prevent race conditions
				const jobStr = await redis.get(redisKey);

				if (jobStr) {
					const jobData = JSON.parse(jobStr);
					const processedDate = new Date(jobData.processedDate).getTime();

					if (now - processedDate >= JOURNEY_TIME_CHECK_SEC * 1000) {
						logger.info(
							`Journey ${journey.documentId} expired; scheduling new job.`,
						);
						await redis.del(redisKey);
					} else {
						logger.info(
							`Journey ${journey.documentId} job still valid; skipping.`,
						);
						continue;
					}
				}

				// Atomically set job key to prevent duplicate scheduling
				const newJob = {
					journeyId: journey.documentId,
					jobKey: redisKey,
					processedDate: new Date().toISOString(),
				};

				// Use SET with NX to atomically create job entry
				const wasSet = await redis.set(
					redisKey,
					JSON.stringify(newJob),
					"EX",
					JOURNEY_TIME_CHECK_SEC,
					"NX",
				);

				if (wasSet === "OK") {
					await publishToJourneyQueue("JOURNEY", newJob);
					logger.info(`Scheduled journey job for ${journey.documentId}`);
				} else {
					logger.warn(
						`Journey ${journey.documentId} job was already scheduled by another instance`,
					);
				}
			}

			return { scheduled: activeJourneys.length };
		},
		SCHEDULER_LOCK_TTL,
	);

	if (result === null) {
		logger.info(
			"Scheduler lock already held by another instance, skipping execution",
		);
	}
}
