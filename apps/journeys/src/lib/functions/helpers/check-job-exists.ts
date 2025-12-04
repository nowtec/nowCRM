import type { DocumentId } from "@nowcrm/services";
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
 * Atomically sets a job key in Redis if it doesn't exist (prevents race conditions)
 * Uses SETNX (SET if Not eXists) for atomic check-and-set operation
 * The key expires after 30 days to prevent Redis from growing indefinitely
 * @returns true if the key was set (job didn't exist), false if it already existed
 */
export async function setJobKeyAtomic(
	contactId: DocumentId,
	journeyId: DocumentId,
	stepId: DocumentId,
): Promise<boolean> {
	const jobKey = `job-contact:${contactId}-journey:${journeyId}-step:${stepId}`;
	const ttlSeconds = 30 * 24 * 60 * 60; // 30 days
	
	// Use SET with NX (only if not exists) and EX (expiration) for atomic operation
	// Returns "OK" if key was set, null if key already exists
	// ioredis syntax: set(key, value, 'EX', seconds, 'NX')
	const result = await redis.set(jobKey, "1", "EX", ttlSeconds, "NX");
	return result === "OK";
}

/**
 * Sets a job key in Redis to track that a job has been created
 * The key expires after 30 days to prevent Redis from growing indefinitely
 * @deprecated Use setJobKeyAtomic instead to prevent race conditions
 */
export async function setJobKey(
	contactId: DocumentId,
	journeyId: DocumentId,
	stepId: DocumentId,
): Promise<void> {
	const jobKey = `job-contact:${contactId}-journey:${journeyId}-step:${stepId}`;
	// Set with 30 days expiration (in seconds)
	await redis.setex(jobKey, 30 * 24 * 60 * 60, "1");
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

