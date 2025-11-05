import { JOURNEY_TIME_CHECK_SEC } from "../config";
import { fetchActiveJourneys } from "../lib/functions/helpers/fetchActiveJourneys";
import { logger } from "../logger";
import { publishToJourneyQueue } from "../rabbitmq";
import { redis } from "../redis";

export async function scheduleJourneys() {
	logger.info("Scheduling journey processing jobs...");
	const activeJourneys = await fetchActiveJourneys();
	const now = Date.now();

	for (const journey of activeJourneys) {
		const redisKey = `journey-job:${journey.id}`;
		const jobStr = await redis.get(redisKey);

		if (jobStr) {
			const jobData = JSON.parse(jobStr);
			const processedDate = new Date(jobData.processedDate).getTime();

			if (now - processedDate >= JOURNEY_TIME_CHECK_SEC * 1000) {
				logger.info(`Journey ${journey.id} expired; scheduling new job.`);
				await redis.del(redisKey);
			} else {
				logger.info(`Journey ${journey.id} job still valid; skipping.`);
				continue;
			}
		}

		const newJob = {
			journeyId: journey.id,
			jobKey: redisKey,
			processedDate: new Date().toISOString(),
		};
		await redis.set(redisKey, JSON.stringify(newJob));
		publishToJourneyQueue("JOURNEY", newJob);
	}
}
