import type { DocumentId, JourneyTiming } from "@nowcrm/services";
import { env } from "../../../common/utils/env-config";
import { logger } from "../../../logger";
import { redis } from "../../../redis";

/**
 * Checks if a job already exists in Redis (for tracking pending jobs)
 * Uses the job key format: job-contact:{contactId}-journey:{journeyId}-step:{stepId}
 */
export async function checkJobExists(
	contactId: DocumentId,
	journeyId: DocumentId,
	stepId: DocumentId,
): Promise<boolean> {
	const jobKey = `job-contact:${contactId}-journey:${journeyId}-step:${stepId}`;
	const exists = await redis.exists(jobKey);
	return exists === 1;
}

/**
 * Calculates TTL for a job key based on job type and timing
 * @param jobType - Type of job (channel, wait, scheduler-trigger, publish)
 * @param timing - Optional timing information for delayed jobs
 * @returns TTL in seconds
 */
export function calculateJobKeyTTL(
	_jobType: string,
	timing?: JourneyTiming | null,
): number {
	const baseTTL = env.JOURNEYS_JOB_KEY_BASE_TTL_SECONDS;
	const processingBuffer = env.JOURNEYS_JOB_KEY_PROCESSING_BUFFER_SECONDS;
	const maxTTL = env.JOURNEYS_JOB_KEY_MAX_TTL_SECONDS;

	// For jobs with timing (DELAYED queue), calculate TTL based on delay + buffer
	if (timing?.value) {
		let delaySeconds = 0;
		if (timing.type === "delay") {
			// Delay is stored in minutes, convert to seconds
			delaySeconds = Number(timing.value) * 60;
		} else {
			// Scheduled time - calculate delay until scheduled time
			const scheduledTime = new Date(String(timing.value)).getTime();
			const now = Date.now();
			delaySeconds = Math.max(0, Math.floor((scheduledTime - now) / 1000));
		}

		// TTL = delay + processing buffer + base TTL for safety
		// Cap at max TTL to prevent extremely long TTLs
		const calculatedTTL = delaySeconds + processingBuffer + baseTTL;
		return Math.min(calculatedTTL, maxTTL);
	}

	// For immediate jobs (JOB queue), use base TTL + processing buffer
	return Math.min(baseTTL + processingBuffer, maxTTL);
}

/**
 * Atomically sets a job key in Redis if it doesn't exist (prevents race conditions)
 * Uses SETNX (SET if Not eXists) for atomic check-and-set operation
 * TTL is calculated dynamically based on job type and timing
 * @param contactId - Contact ID
 * @param journeyId - Journey ID
 * @param stepId - Step ID
 * @param jobType - Type of job (channel, wait, scheduler-trigger, publish)
 * @param timing - Optional timing information for delayed jobs
 * @returns true if the key was set (job didn't exist), false if it already existed
 */
export async function setJobKeyAtomic(
	contactId: DocumentId,
	journeyId: DocumentId,
	stepId: DocumentId,
	jobType?: string,
	timing?: JourneyTiming | null,
): Promise<boolean> {
	const jobKey = `job-contact:${contactId}-journey:${journeyId}-step:${stepId}`;

	// Calculate TTL based on job type and timing
	const ttlSeconds =
		jobType && timing !== undefined
			? calculateJobKeyTTL(jobType, timing)
			: env.JOURNEYS_JOB_KEY_BASE_TTL_SECONDS +
				env.JOURNEYS_JOB_KEY_PROCESSING_BUFFER_SECONDS;

	logger.debug(
		{
			jobKey,
			jobType,
			ttlSeconds,
			ttlHours: ttlSeconds / 3600,
			hasTiming: !!timing,
		},
		"Setting job key with calculated TTL",
	);

	// Use SET with NX (only if not exists) and EX (expiration) for atomic operation
	// Returns "OK" if key was set, null if key already exists
	// ioredis syntax: set(key, value, 'EX', seconds, 'NX')
	const result = await redis.set(jobKey, "1", "EX", ttlSeconds, "NX");
	return result === "OK";
}

/**
 * Extends the TTL of an existing job key
 * Useful when job processing takes longer than expected
 * @param contactId - Contact ID
 * @param journeyId - Journey ID
 * @param stepId - Step ID
 * @param additionalSeconds - Additional seconds to add to current TTL (default: base TTL)
 * @returns true if TTL was extended, false if key doesn't exist
 */
export async function extendJobKeyTTL(
	contactId: DocumentId,
	journeyId: DocumentId,
	stepId: DocumentId,
	additionalSeconds?: number,
): Promise<boolean> {
	const jobKey = `job-contact:${contactId}-journey:${journeyId}-step:${stepId}`;

	// Get current TTL
	const currentTTL = await redis.ttl(jobKey);

	if (currentTTL === -2) {
		// Key doesn't exist
		logger.warn({ jobKey }, "Cannot extend TTL - job key does not exist");
		return false;
	}

	if (currentTTL === -1) {
		// Key exists but has no expiration (shouldn't happen with our implementation)
		logger.warn({ jobKey }, "Job key has no expiration, setting new TTL");
		const newTTL = additionalSeconds ?? env.JOURNEYS_JOB_KEY_BASE_TTL_SECONDS;
		await redis.expire(jobKey, newTTL);
		return true;
	}

	// Extend TTL by adding additional seconds
	const extendBy = additionalSeconds ?? env.JOURNEYS_JOB_KEY_BASE_TTL_SECONDS;
	const newTTL = Math.min(
		currentTTL + extendBy,
		env.JOURNEYS_JOB_KEY_MAX_TTL_SECONDS,
	);

	const result = await redis.expire(jobKey, newTTL);

	logger.debug(
		{
			jobKey,
			oldTTL: currentTTL,
			newTTL,
			extendedBy: extendBy,
		},
		"Extended job key TTL",
	);

	return result === 1;
}

/**
 * Sets a job key in Redis to track that a job has been created
 * Uses dynamic TTL based on job type and timing
 * @deprecated Use setJobKeyAtomic instead to prevent race conditions
 */
export async function setJobKey(
	contactId: DocumentId,
	journeyId: DocumentId,
	stepId: DocumentId,
	jobType?: string,
	timing?: JourneyTiming | null,
): Promise<void> {
	const jobKey = `job-contact:${contactId}-journey:${journeyId}-step:${stepId}`;
	const ttlSeconds =
		jobType && timing !== undefined
			? calculateJobKeyTTL(jobType, timing)
			: env.JOURNEYS_JOB_KEY_BASE_TTL_SECONDS +
				env.JOURNEYS_JOB_KEY_PROCESSING_BUFFER_SECONDS;
	await redis.setex(jobKey, ttlSeconds, "1");
}

/**
 * Removes a job key from Redis (called when job is completed or cancelled)
 */
export async function removeJobKey(
	contactId: DocumentId,
	journeyId: DocumentId,
	stepId: DocumentId,
): Promise<void> {
	const jobKey = `job-contact:${contactId}-journey:${journeyId}-step:${stepId}`;
	await redis.del(jobKey);
}
