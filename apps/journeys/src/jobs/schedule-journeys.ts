import { JOURNEY_TIME_CHECK_SEC } from "../config";
import { withLock } from "../lib/functions/helpers/distributed-lock";
import { fetchActiveJourneys } from "../lib/functions/helpers/fetch-active-journeys";
import { logger } from "../logger";
import { publishToJourneyQueue } from "../rabbitmq";
import { redis } from "../redis";

const SCHEDULER_LOCK_KEY = "journey-scheduler:lock";
const SCHEDULER_LOCK_TTL = 300; // 5 minutes - should be longer than cron execution time
const JOURNEY_JOB_KEY_PREFIX = "journey-job:";

/**
 * Gets all journey IDs that have scheduled jobs in Redis
 */
async function getScheduledJourneyIds(): Promise<string[]> {
	const keys: string[] = [];
	let cursor = "0";

	do {
		const [nextCursor, foundKeys] = await redis.scan(
			cursor,
			"MATCH",
			`${JOURNEY_JOB_KEY_PREFIX}*`,
			"COUNT",
			100,
		);
		cursor = nextCursor;
		keys.push(...foundKeys);
	} while (cursor !== "0");

	// Extract journey IDs from keys (format: journey-job:{journeyId})
	return keys.map((key) => key.replace(JOURNEY_JOB_KEY_PREFIX, ""));
}

/**
 * Cancels a scheduled journey job by removing it from Redis
 */
async function cancelJourneyJob(journeyId: string): Promise<void> {
	const redisKey = `${JOURNEY_JOB_KEY_PREFIX}${journeyId}`;
	const deleted = await redis.del(redisKey);
	if (deleted > 0) {
		logger.info(
			{ journeyId },
			"Cancelled scheduled journey job (journey became inactive)",
		);
	}
}

export async function scheduleJourneys() {
	try {
		// Use distributed lock to prevent concurrent execution across multiple instances
		const result = await withLock(
			SCHEDULER_LOCK_KEY,
			async () => {
				logger.debug("Scheduling journey processing jobs...");

				// 1. Fetch only active journeys
				const activeJourneys = await fetchActiveJourneys();
				logger.debug(
					{
						activeJourneysCount: activeJourneys.length,
						activeJourneyIds: activeJourneys.map((j) => j.documentId),
					},
					"Fetched active journeys",
				);
				const activeJourneyIds = new Set(
					activeJourneys.map((j) => j.documentId),
				);

				// 2. Get all scheduled journey IDs from Redis
				let scheduledJourneyIds: string[] = [];
				try {
					scheduledJourneyIds = await getScheduledJourneyIds();
					logger.debug(
						{
							scheduledJourneyIdsCount: scheduledJourneyIds.length,
							scheduledJourneyIds,
						},
						"Fetched scheduled journey IDs from Redis",
					);
				} catch (error) {
					logger.error(
						{ err: error },
						"Failed to get scheduled journey IDs from Redis, continuing with empty list",
					);
					// Continue with empty list - will just schedule all active journeys
				}

				// 3. Cancel jobs for journeys that are no longer active
				logger.debug(
					{
						scheduledJourneyIdsCount: scheduledJourneyIds.length,
						activeJourneyIdsCount: activeJourneyIds.size,
					},
					"Checking for journeys to cancel",
				);
				for (const scheduledJourneyId of scheduledJourneyIds) {
					if (!activeJourneyIds.has(scheduledJourneyId)) {
						// Journey is no longer active, cancel its scheduled job
						await cancelJourneyJob(scheduledJourneyId);
					}
				}
				logger.debug("Finished checking for journeys to cancel");

				// 4. For each active journey, check if job already exists
				let scheduledCount = 0;
				let skippedCount = 0;
				logger.debug(
					{
						activeJourneysCount: activeJourneys.length,
					},
					"Starting to process active journeys",
				);

				for (const journey of activeJourneys) {
					const redisKey = `${JOURNEY_JOB_KEY_PREFIX}${journey.documentId}`;
					logger.debug(
						{
							journeyId: journey.documentId,
							redisKey,
							journeyIndex: activeJourneys.indexOf(journey) + 1,
							totalJourneys: activeJourneys.length,
						},
						"Processing journey for scheduling",
					);

					try {
						// Check if job already exists
						const jobExists = await redis.exists(redisKey);
						logger.debug(
							{
								journeyId: journey.documentId,
								redisKey,
								jobExists: jobExists === 1,
							},
							"Checked if journey job exists in Redis",
						);
						if (jobExists) {
							logger.debug(
								{
									journeyId: journey.documentId,
									redisKey,
								},
								"Journey already has a scheduled job in Redis, skipping",
							);
							skippedCount++;
							continue;
						}
					} catch (error) {
						logger.error(
							{
								err: error,
								journeyId: journey.documentId,
								redisKey,
							},
							"Failed to check if journey job exists, will try to create new job",
						);
						// Continue to try creating the job
					}

					// 5. Create new job for active journey without existing job
					const newJob = {
						journeyId: journey.documentId,
						jobKey: redisKey,
						processedDate: new Date().toISOString(),
					};

					try {
						logger.debug(
							{
								journeyId: journey.documentId,
								redisKey,
							},
							"Attempting to create Redis key and schedule journey job",
						);
						// Atomically set job key to prevent duplicate scheduling
						// Set TTL to JOURNEY_TIME_CHECK_SEC to ensure it expires if not rescheduled
						const wasSet = await redis.set(
							redisKey,
							JSON.stringify(newJob),
							"EX",
							JOURNEY_TIME_CHECK_SEC,
							"NX",
						);

						logger.debug(
							{
								journeyId: journey.documentId,
								redisKey,
								wasSet,
							},
							"Redis SET result",
						);

						if (wasSet === "OK") {
							logger.debug(
								{
									journeyId: journey.documentId,
								},
								"Publishing journey job to queue",
							);
							await publishToJourneyQueue("JOURNEY", newJob);
							logger.debug(
								{
									journeyId: journey.documentId,
									redisKey,
								},
								"Scheduled new journey processing job",
							);
							scheduledCount++;
						} else {
							logger.warn(
								{
									journeyId: journey.documentId,
									redisKey,
									wasSet,
								},
								"Journey job was already scheduled by another instance (race condition)",
							);
							skippedCount++;
						}
					} catch (error) {
						logger.error(
							{
								err: error,
								journeyId: journey.documentId,
								redisKey,
							},
							"Failed to schedule journey job",
						);
						// Continue with next journey even if this one failed
					}
				}

				logger.debug(
					{
						scheduledCount,
						skippedCount,
						totalProcessed: scheduledCount + skippedCount,
						activeJourneysCount: activeJourneys.length,
					},
					"Finished processing all active journeys",
				);

				logger.debug(
					{
						activeJourneys: activeJourneys.length,
						activeJourneyIds: Array.from(activeJourneyIds),
						scheduled: scheduledCount,
						skipped: skippedCount,
						scheduledJourneyIds,
						cancelled: scheduledJourneyIds.length - activeJourneyIds.size,
					},
					"Journey scheduling completed",
				);

				return {
					activeJourneys: activeJourneys.length,
					scheduled: scheduledCount,
					cancelled: scheduledJourneyIds.length - activeJourneyIds.size,
				};
			},
			SCHEDULER_LOCK_TTL,
		);

		if (result === null) {
			logger.debug(
				"Scheduler lock already held by another instance, skipping execution",
			);
		} else if (result) {
			logger.debug({ result }, "Scheduler completed successfully");
		}
	} catch (error) {
		logger.error(
			{ err: error },
			"Failed to schedule journeys - unexpected error",
		);
		throw error; // Re-throw to ensure calling code knows about the failure
	}
}
