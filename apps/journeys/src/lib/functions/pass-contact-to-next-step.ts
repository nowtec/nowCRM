import type { DocumentId } from "@nowcrm/services";
import { contactsService } from "@nowcrm/services/server";
import { adaptiveRateLimiter } from "@/common/utils/adaptive-rate-limiter";
import { env } from "@/common/utils/env-config";
import { logger } from "../../logger";
import { withLock } from "./helpers/distributed-lock";

/**
 * Performs the actual contact update logic
 * Separated into a helper function to avoid code duplication
 */
async function updateContactJourneySteps(
	contactId: DocumentId,
	currentStep: DocumentId,
	journeyId: DocumentId,
	nextStep: DocumentId | null,
): Promise<void> {
	const contactCurrent = await adaptiveRateLimiter.execute(() =>
		contactsService.findOne(contactId, env.JOURNEYS_STRAPI_API_TOKEN, {
			populate: "*",
		}),
	);
	if (!contactCurrent.success || !contactCurrent.data) {
		throw new Error(
			`Failed to fetch contact details ${contactId} : ${contactCurrent.errorMessage}`,
		);
	}

	let journeysUpdated: DocumentId[] = contactCurrent.data.journeys.map(
		(item) => {
			return item.documentId;
		},
	);
	const updatedStepIds: DocumentId[] = contactCurrent.data.journey_steps
		.filter((item) => item.documentId !== currentStep)
		.map((item) => item.documentId);

	if (nextStep) {
		updatedStepIds.push(nextStep);
	} else {
		//last step removing journey id for updating
		journeysUpdated = contactCurrent.data.journeys
			.filter((item) => item.documentId !== journeyId)
			.map((item) => item.documentId);
	}

	const response = await adaptiveRateLimiter.execute(() =>
		contactsService.update(
			contactId,
			{
				journey_steps: { set: updatedStepIds },
				journeys: { set: journeysUpdated },
			},
			env.JOURNEYS_STRAPI_API_TOKEN,
		),
	);

	if (!response.success) {
		throw new Error(
			`Failed to update contact journey steps: ${response.errorMessage}`,
		);
	}
}

/**
 * Updates a contact's journey steps and journeys
 * Uses a distributed lock per journey to prevent concurrent update conflicts
 * when multiple contacts are being removed from the same journey simultaneously
 */
export async function passContactToNextStep(
	contactId: DocumentId,
	currentStep: DocumentId,
	journeyId: DocumentId,
	nextStep: DocumentId | null,
): Promise<void> {
	// Use distributed lock per journey to serialize updates and prevent transaction conflicts
	// When multiple contacts are being processed in parallel and removing the same journey,
	// this prevents Strapi transaction conflicts
	const lockKey = `contact-update:journey:${journeyId}`;
	const lockTTL = 30; // 30 seconds should be enough for a contact update

	const result = await withLock(
		lockKey,
		async () => {
			await updateContactJourneySteps(
				contactId,
				currentStep,
				journeyId,
				nextStep,
			);
		},
		lockTTL,
	);

	if (result === null) {
		// Lock could not be acquired - retry after a short delay with jitter
		// This happens when another contact is updating the same journey
		// Use exponential backoff with jitter to reduce collision probability
		const maxRetries = 5;
		let retryCount = 0;

		while (retryCount < maxRetries) {
			const retryDelay = (100 + Math.random() * 200) * (retryCount + 1); // Increasing delay with jitter
			logger.debug(
				{
					contactId,
					journeyId,
					retryDelay,
					retryCount: retryCount + 1,
					maxRetries,
				},
				"Could not acquire lock for contact update, retrying after delay",
			);
			await new Promise((resolve) => setTimeout(resolve, retryDelay));

			const retryResult = await withLock(
				lockKey,
				async () => {
					await updateContactJourneySteps(
						contactId,
						currentStep,
						journeyId,
						nextStep,
					);
				},
				lockTTL,
			);

			if (retryResult !== null) {
				// Successfully acquired lock and updated
				return;
			}

			retryCount++;
		}

		// If we've exhausted retries, throw an error
		// The retry handler will catch this and retry the entire message
		throw new Error(
			`Failed to acquire lock for contact update after ${maxRetries} retries. Another contact is likely updating the same journey.`,
		);
	}
}
