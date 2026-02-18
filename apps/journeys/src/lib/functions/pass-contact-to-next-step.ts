import type { DocumentId } from "@nowcrm/services";
import { contactsService } from "@nowcrm/services/server";
import pLimit from "p-limit";
import { adaptiveRateLimiter } from "@/common/utils/adaptive-rate-limiter";
import { env } from "@/common/utils/env-config";
import { redis } from "@/redis";
import { logger } from "../../logger";
import { buildContactUrl } from "./helpers/build-service-url";
import { releaseLock } from "./helpers/distributed-lock";

// Lock configuration - contact-level locking to prevent concurrent updates to same contact
const LOCK_TTL_SECONDS = 15; // Lock expires after 15 seconds (updates should be quick)
const LOCK_MAX_RETRIES = 10; // Max attempts to acquire lock
const LOCK_INITIAL_RETRY_DELAY_MS = 20; // Start with 20ms delay
const LOCK_MAX_RETRY_DELAY_MS = 200; // Cap at 200ms to keep delays short
const LOCK_BACKOFF_MULTIPLIER = 1.5; // Exponential backoff multiplier

// Global semaphore to limit concurrent contact updates to Strapi
// This prevents overwhelming Strapi even though we have per-contact locks
// Different contacts can still update concurrently, but we limit total concurrency
const CONTACT_UPDATE_CONCURRENCY = 3; // Max 3 concurrent contact updates to Strapi
const contactUpdateSemaphore = pLimit(CONTACT_UPDATE_CONCURRENCY);

/**
 * Calculates exponential backoff delay with jitter
 * Keeps delays short to minimize impact on processing time
 */
function calculateRetryDelay(
	attempt: number,
	initialDelay: number,
	maxDelay: number,
	multiplier: number,
): number {
	const baseDelay = initialDelay * multiplier ** attempt;
	const delay = Math.min(baseDelay, maxDelay);
	// Add small random jitter (±10%) to prevent thundering herd
	const jitter = delay * 0.1 * (Math.random() * 2 - 1);
	return Math.max(10, Math.floor(delay + jitter));
}

/**
 * Sleeps for the specified milliseconds
 */
function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Acquires a contact-level lock with retry logic
 * Uses exponential backoff to avoid thundering herd
 * Returns lock key and value needed for release
 */
async function acquireContactLock(
	contactId: DocumentId,
): Promise<{ lockKey: string; lockValue: string } | null> {
	const lockKey = `contact-update-lock:${contactId}`;

	for (let attempt = 0; attempt < LOCK_MAX_RETRIES; attempt++) {
		const lockValue = `${Date.now()}-${Math.random()}`;
		// Use Redis SET directly to get the value we set
		const result = await redis.set(
			lockKey,
			lockValue,
			"EX",
			LOCK_TTL_SECONDS,
			"NX",
		);
		if (result === "OK") {
			logger.debug(
				{
					contactId,
					lockKey,
					attempt: attempt + 1,
				},
				"Successfully acquired contact lock",
			);
			return { lockKey, lockValue };
		}

		if (attempt < LOCK_MAX_RETRIES - 1) {
			const delay = calculateRetryDelay(
				attempt,
				LOCK_INITIAL_RETRY_DELAY_MS,
				LOCK_MAX_RETRY_DELAY_MS,
				LOCK_BACKOFF_MULTIPLIER,
			);
			logger.debug(
				{
					contactId,
					lockKey,
					attempt: attempt + 1,
					maxRetries: LOCK_MAX_RETRIES,
					delayMs: delay,
				},
				"Lock acquisition failed, retrying",
			);
			await sleep(delay);
		}
	}

	logger.warn(
		{
			contactId,
			lockKey,
			maxRetries: LOCK_MAX_RETRIES,
		},
		"Failed to acquire contact lock after max retries",
	);
	return null;
}

// Retry configuration for transient 500 errors
// These retries happen at the passContactToNextStep level (lock is released and re-acquired)
const UPDATE_MAX_RETRIES = 3; // Max retries for transient update errors
const UPDATE_RETRY_INITIAL_DELAY_MS = 2000; // Initial delay: 2 seconds (allows Strapi transactions to complete)
const UPDATE_RETRY_BACKOFF_MULTIPLIER = 2.0; // Exponential backoff multiplier (2s -> 4s -> 8s)

/**
 * Performs the actual contact update logic with retry for transient errors
 * Uses set to replace entire relation arrays (simpler with locks preventing conflicts)
 * Retries on 500 errors by re-fetching the contact to get latest data
 */
async function updateContactJourneySteps(
	contactId: DocumentId,
	currentStep: DocumentId,
	journeyId: DocumentId,
	nextStep: DocumentId | null,
	attempt: number = 1,
): Promise<void> {
	// Fetch contact to get current journey_steps and journeys
	const contactUrl = buildContactUrl(contactId);
	const contactResp = await adaptiveRateLimiter.execute(
		() =>
			contactsService.findOne(contactId, env.JOURNEYS_STRAPI_API_TOKEN, {
				populate: {
					journey_steps: true,
					journeys: true,
				},
			}),
		`contactsService.findOne (updateContactJourneySteps) - ${contactUrl}`,
	);

	if (!contactResp.success || !contactResp.data) {
		throw new Error(
			`Failed to fetch contact: ${contactResp.errorMessage || "Unknown error"}`,
		);
	}

	const contact = contactResp.data;
	const currentJourneySteps =
		(contact.journey_steps as { documentId: DocumentId }[]) || [];
	const currentJourneys =
		(contact.journeys as { documentId: DocumentId }[]) || [];

	// Build new journey_steps array: remove currentStep, add nextStep if exists
	const updatedJourneySteps = currentJourneySteps
		.filter((step) => step.documentId !== currentStep)
		.map((step) => step.documentId);

	if (nextStep) {
		// Check if nextStep is already in the array (idempotency check)
		if (!updatedJourneySteps.includes(nextStep)) {
			updatedJourneySteps.push(nextStep);
		}
	}

	// Idempotency check: if the contact is already in the correct state, skip update
	// Correct state means: currentStep is NOT in journey_steps, and nextStep IS in journey_steps (if provided)
	const currentStepIds = currentJourneySteps.map((step) => step.documentId);
	const hasCurrentStep = currentStepIds.includes(currentStep);
	const hasNextStep = nextStep ? currentStepIds.includes(nextStep) : true;
	const isAlreadyCorrect =
		!hasCurrentStep && (nextStep === null || hasNextStep);

	if (isAlreadyCorrect && attempt === 1) {
		logger.debug(
			{
				contactId,
				currentStep,
				nextStep,
				journeyId,
				currentStepIds,
			},
			"Contact already in correct state, skipping update (idempotency)",
		);
		return; // No update needed
	}

	// Build new journeys array: remove journeyId if nextStep is null (last step)
	let updatedJourneys = currentJourneys.map((journey) => journey.documentId);
	if (!nextStep) {
		updatedJourneys = updatedJourneys.filter(
			(journey) => journey !== journeyId,
		);
	}

	// Build update payload using set
	const updatePayload: {
		journey_steps?: { set: DocumentId[] };
		journeys?: { set: DocumentId[] };
	} = {
		journey_steps: { set: updatedJourneySteps },
	};

	// Only update journeys relation if it changed (last step)
	if (!nextStep) {
		updatePayload.journeys = { set: updatedJourneys };
	}

	logger.debug(
		{
			contactId,
			currentStep,
			nextStep,
			journeyId,
			updatedJourneySteps,
			updatedJourneys: !nextStep ? updatedJourneys : undefined,
			attempt,
		},
		"Updating contact with set operation",
	);

	const updateUrl = buildContactUrl(contactId);
	const response = await adaptiveRateLimiter.execute(
		() =>
			contactsService.update(
				contactId,
				updatePayload,
				env.JOURNEYS_STRAPI_API_TOKEN,
			),
		`contactsService.update (passContactToNextStep) - ${updateUrl}`,
	);

	if (!response.success) {
		const errorMessage = response.errorMessage || "Unknown error";
		const statusCode = response.status || 0;
		const isTransientError =
			(statusCode >= 500 && statusCode < 600) ||
			errorMessage.includes("500") ||
			errorMessage.includes("Internal Server Error") ||
			errorMessage.includes("502") ||
			errorMessage.includes("503") ||
			errorMessage.includes("504");

		// Log detailed error information
		logger.error(
			{
				contactId,
				currentStep,
				nextStep,
				journeyId,
				attempt,
				statusCode,
				errorMessage,
				updatePayload,
			},
			"Contact update failed",
		);

		// Create a special error that signals we should retry at the lock level
		if (isTransientError && attempt < UPDATE_MAX_RETRIES) {
			const retryDelay =
				UPDATE_RETRY_INITIAL_DELAY_MS *
				UPDATE_RETRY_BACKOFF_MULTIPLIER ** (attempt - 1);

			const retryError = new Error(
				`TRANSIENT_ERROR:${errorMessage} (Status: ${statusCode})`,
			) as Error & {
				isTransient: boolean;
				retryDelay: number;
				attempt: number;
			};
			retryError.isTransient = true;
			retryError.retryDelay = retryDelay;
			retryError.attempt = attempt;
			throw retryError;
		}

		throw new Error(
			`Failed to update contact journey steps: ${errorMessage} (Status: ${statusCode})`,
		);
	}
}

/**
 * Internal function that performs the actual update with lock
 * This is wrapped by the semaphore in the public function
 */
async function passContactToNextStepInternal(
	contactId: DocumentId,
	currentStep: DocumentId,
	journeyId: DocumentId,
	nextStep: DocumentId | null,
	attempt: number = 1,
): Promise<void> {
	// Acquire contact-level lock with retry
	const lock = await acquireContactLock(contactId);
	if (!lock) {
		throw new Error(
			`Failed to acquire lock for contact ${contactId} after ${LOCK_MAX_RETRIES} retries`,
		);
	}

	try {
		logger.debug(
			{
				contactId,
				currentStep,
				journeyId,
				nextStep,
				lockKey: lock.lockKey,
				attempt,
			},
			"Acquired contact lock, updating journey steps",
		);

		// With lock acquired, update should succeed without conflicts
		await updateContactJourneySteps(
			contactId,
			currentStep,
			journeyId,
			nextStep,
		);

		logger.debug(
			{
				contactId,
				journeyId,
				nextStep,
			},
			"Successfully updated contact journey steps",
		);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		const errorStack = error instanceof Error ? error.stack : undefined;

		// Check if this is a transient error that should be retried
		const isTransientError =
			error instanceof Error &&
			"isTransient" in error &&
			(error as Error & { isTransient: boolean }).isTransient === true;

		if (isTransientError && attempt < UPDATE_MAX_RETRIES) {
			const retryError = error as Error & {
				isTransient: boolean;
				retryDelay: number;
				attempt: number;
			};
			const retryDelay = retryError.retryDelay;

			logger.warn(
				{
					contactId,
					currentStep,
					nextStep,
					journeyId,
					attempt,
					maxRetries: UPDATE_MAX_RETRIES,
					retryDelayMs: retryDelay,
					errorMessage,
				},
				"Transient error detected, releasing lock and retrying after delay to allow Strapi transaction to complete",
			);

			// Release the lock BEFORE waiting - this allows other processes to proceed
			// and allows Strapi's transaction to complete
			await releaseLock(lock.lockKey, lock.lockValue);
			logger.debug(
				{
					contactId,
					lockKey: lock.lockKey,
				},
				"Released contact lock before retry",
			);

			// Wait with exponential backoff to allow Strapi's transaction to complete
			await sleep(retryDelay);

			// Retry by calling ourselves recursively - this will re-acquire the lock
			// The semaphore will be applied again at the public function level
			return passContactToNextStep(
				contactId,
				currentStep,
				journeyId,
				nextStep,
				attempt + 1,
			);
		}

		logger.error(
			{
				err: error,
				contactId,
				currentStep,
				journeyId,
				nextStep,
				errorMessage,
				errorStack,
				attempt,
			},
			"Error updating contact journey steps",
		);

		// Re-throw to let the caller handle the error
		throw error;
	} finally {
		// Release lock only if we're not retrying (retry path returns early)
		// Note: releaseLock is safe to call even if lock was already released
		await releaseLock(lock.lockKey, lock.lockValue);
		logger.debug(
			{
				contactId,
				lockKey: lock.lockKey,
			},
			"Released contact lock",
		);
	}
}

/**
 * Updates a contact's journey steps and journeys with contact-level locking
 * Uses distributed lock per contact to prevent concurrent updates to the same contact
 * while allowing parallel processing of different contacts
 * Uses a global semaphore to limit total concurrent updates to Strapi (max 3 at a time)
 * This prevents overwhelming Strapi even though we have per-contact locks
 * Handles transient errors by releasing lock, waiting for Strapi transactions to complete, then retrying
 */
export async function passContactToNextStep(
	contactId: DocumentId,
	currentStep: DocumentId,
	journeyId: DocumentId,
	nextStep: DocumentId | null,
	attempt: number = 1,
): Promise<void> {
	// Use semaphore to limit concurrent contact updates globally
	// This prevents overwhelming Strapi even though we have per-contact locks
	// Max 3 concurrent contact updates to Strapi at any time
	return contactUpdateSemaphore(async () => {
		return passContactToNextStepInternal(
			contactId,
			currentStep,
			journeyId,
			nextStep,
			attempt,
		);
	});
}
