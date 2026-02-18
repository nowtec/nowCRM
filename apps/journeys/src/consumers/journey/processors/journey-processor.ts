import type { DocumentId } from "@nowcrm/services";
import { journeyPassedStepService } from "@nowcrm/services/server";
import { adaptiveRateLimiter } from "@/common/utils/adaptive-rate-limiter";
import { env } from "@/common/utils/env-config";
import { JOURNEY_TIME_CHECK_SEC } from "../../../config";
import { createJob } from "../../../jobs/create-job";
import { buildServiceUrl } from "../../../lib/functions/helpers/build-service-url";
import { isJourneyActive } from "../../../lib/functions/helpers/check-journey-active";
import { getJourney } from "../../../lib/functions/helpers/get-jouney";
import { logger } from "../../../logger";
import { publishToJourneyQueue } from "../../../rabbitmq";
import { redis } from "../../../redis";

const JOURNEY_JOB_KEY_PREFIX = "journey-job:";

/**
 * Schedules the journey job to rerun after JOURNEY_TIME_CHECK_SEC
 */
async function scheduleNextRun(journeyId: DocumentId): Promise<void> {
	const redisKey = `${JOURNEY_JOB_KEY_PREFIX}${journeyId}`;
	const delayMs = JOURNEY_TIME_CHECK_SEC * 1000; // Convert to milliseconds

	// Update Redis key with new scheduled time
	const newJob = {
		journeyId,
		jobKey: redisKey,
		processedDate: new Date().toISOString(),
		scheduledFor: new Date(Date.now() + delayMs).toISOString(),
	};

	// Set Redis key with TTL slightly longer than delay to ensure it exists when job runs
	await redis.set(
		redisKey,
		JSON.stringify(newJob),
		"EX",
		JOURNEY_TIME_CHECK_SEC + 60, // Add 60 seconds buffer
	);

	// Schedule job to run after delay using delayed queue
	await publishToJourneyQueue("JOURNEY", newJob, delayMs);

	logger.debug(
		{
			journeyId,
			delayMs,
			delayMinutes: delayMs / (60 * 1000),
			scheduledFor: newJob.scheduledFor,
		},
		"Scheduled journey job to rerun after delay",
	);
}

/**
 * Journey processing: checks for new contacts and creates jobs for them
 * After completion, schedules itself to rerun after JOURNEY_TIME_CHECK_SEC
 */
export async function processJourneyMessage({
	journeyId,
}: {
	journeyId: DocumentId;
}) {
	logger.debug({ journeyId }, "Processing journey");

	// Check if journey is still active before processing
	const isActive = await isJourneyActive(journeyId);
	if (!isActive) {
		logger.debug(
			{ journeyId },
			"Journey is no longer active, cancelling scheduled job and removing from Redis",
		);
		// Remove Redis key to cancel future runs
		const redisKey = `${JOURNEY_JOB_KEY_PREFIX}${journeyId}`;
		try {
			await redis.del(redisKey);
			logger.debug(
				{ journeyId, redisKey },
				"Removed Redis key for inactive journey",
			);
		} catch (redisError) {
			logger.error(
				{ err: redisError, journeyId, redisKey },
				"Failed to remove Redis key for inactive journey",
			);
			// Don't throw - allow message to be acked
		}
		// Return early - consumer will ack the message since no error was thrown
		return;
	}

	const res = await getJourney(journeyId);
	if (!res.success) {
		// Check if journey was deleted (404)
		if (
			res.message?.includes("not found") ||
			res.message?.includes("deleted")
		) {
			logger.info(
				{ journeyId },
				"Journey was deleted, cancelling scheduled job and removing from Redis",
			);
			// Remove Redis key to cancel future runs
			const redisKey = `${JOURNEY_JOB_KEY_PREFIX}${journeyId}`;
			try {
				await redis.del(redisKey);
				logger.debug(
					{ journeyId, redisKey },
					"Removed Redis key for deleted journey",
				);
			} catch (redisError) {
				logger.error(
					{ err: redisError, journeyId, redisKey },
					"Failed to remove Redis key for deleted journey",
				);
				// Don't throw - allow message to be acked
			}
			// Return early - consumer will ack the message since no error was thrown
			return;
		}
		throw new Error(res.message);
	}

	if (!res.responseObject?.journey_steps) {
		throw new Error("Journey response has no journey_steps");
	}

	let totalContactsProcessed = 0;

	// Process steps sequentially but contacts in parallel to reduce N+1 queries
	for (const step of res.responseObject.journey_steps) {
		if (!step.contacts) continue;
		//Ignore trigger cause they have own logic of creating jobs
		if (step.type === "trigger") continue;

		// Process contacts in parallel batches to reduce sequential awaits
		const contactPromises = step.contacts.map(async (contact) => {
			try {
				// Check if contact has already passed this step
				// Only check passedStep - the checkStepAction is redundant since
				// job-processor.ts will check again for idempotency when processing the job
				const passedStepUrl = buildServiceUrl(
					"journey-passed-steps",
					undefined,
					{
						filters: {
							journey_step: { documentId: { $eq: step.documentId } },
							contact: { documentId: { $eq: contact.documentId } },
							journey: { documentId: { $eq: journeyId } },
							composition: {
								documentId: {
									$eq: step.composition?.documentId || undefined,
								},
							},
							channel: {
								documentId: { $eq: step.channel?.documentId || undefined },
							},
						},
					},
				);
				const passedStep = await adaptiveRateLimiter.execute(
					() =>
						journeyPassedStepService.find(env.JOURNEYS_STRAPI_API_TOKEN, {
							filters: {
								journey_step: { documentId: { $eq: step.documentId } },
								contact: { documentId: { $eq: contact.documentId } },
								journey: { documentId: { $eq: journeyId } },
								composition: {
									documentId: {
										$eq: step.composition?.documentId || undefined,
									},
								},
								channel: {
									documentId: { $eq: step.channel?.documentId || undefined },
								},
							},
						}),
					`journeyPassedStepService.find (processJourneyMessage) - ${passedStepUrl}`,
				);
				if (!passedStep.success || !passedStep.data) {
					throw new Error(passedStep.errorMessage);
				}
				if (passedStep.data.length > 0) {
					// Contact has already passed this step, skip creating job
					return null;
				}

				// Create job for new contact that hasn't processed this step yet
				await createJob({
					contact: contact.documentId,
					journey: journeyId,
					type: step.type,
					journey_step: step.documentId,
					composition: step.composition?.documentId || undefined,
					channel: step.channel?.documentId || undefined,
					timing: step.timing,
					skipValidation: false, // Still validate step exists and has required fields
				});
				return contact.documentId;
			} catch (error) {
				logger.error(
					{
						err: error,
						contactId: contact.documentId,
						stepId: step.documentId,
					},
					"Error processing contact for journey step",
				);
				// Don't throw - continue processing other contacts
				return null;
			}
		});

		// Wait for all contacts in this step to be processed
		const results = await Promise.allSettled(contactPromises);
		const successful = results.filter(
			(r) => r.status === "fulfilled" && r.value !== null,
		).length;

		totalContactsProcessed += successful;

		if (successful > 0) {
			logger.debug(
				{
					journeyId,
					stepId: step.documentId,
					contactsProcessed: successful,
				},
				"Processed contacts for journey step",
			);
		}
	}

	logger.debug(
		{
			journeyId,
			totalContactsProcessed,
		},
		"Journey processing completed",
	);

	// After processing, schedule next run if journey is still active
	// Reuse journey data from earlier fetch - if getJourney succeeded, journey exists
	// Only check active status if we need to verify it hasn't changed
	// Since we already fetched the journey with active status, we can use that data
	try {
		// Use the journey data we already fetched to check active status
		// This avoids a duplicate API call to check journey status
		const isStillActive = res.responseObject?.active === true;
		if (isStillActive) {
			await scheduleNextRun(journeyId);
		} else {
			logger.debug(
				{ journeyId },
				"Journey became inactive during processing, not scheduling next run",
			);
			// Remove Redis key to cancel future runs
			const redisKey = `${JOURNEY_JOB_KEY_PREFIX}${journeyId}`;
			await redis.del(redisKey);
		}
	} catch (scheduleError) {
		// If scheduling fails, log error but don't throw - message should still be acked
		// The journey will be picked up again by cron if needed
		logger.error(
			{
				err: scheduleError,
				journeyId,
			},
			"Failed to schedule next run for journey, will be picked up by cron",
		);
		// Don't throw - allow message to be acked so it doesn't get stuck
	}
}
