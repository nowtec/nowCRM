import type { DocumentId } from "@nowcrm/services";
import { journeyPassedStepService } from "@nowcrm/services/server";
import { adaptiveRateLimiter } from "@/common/utils/adaptive-rate-limiter";
import { env } from "@/common/utils/env-config";
import { logger } from "../../../logger";

/**
 * Checks if a contact has already passed a specific journey step
 * Used for idempotency checks to prevent duplicate processing
 * @param stepId - The journey step ID
 * @param contactId - The contact ID
 * @param journeyId - The journey ID
 * @param compositionId - Optional composition ID (for channel steps)
 * @param channelId - Optional channel ID (for channel steps)
 * @returns true if the step has already been passed, false otherwise
 */
export async function checkStepPassed(
	stepId: DocumentId,
	contactId: DocumentId,
	journeyId: DocumentId,
	compositionId?: DocumentId,
	channelId?: DocumentId,
): Promise<boolean> {
	try {
		const filters: any = {
			journey_step: { documentId: { $eq: stepId } },
			contact: { documentId: { $eq: contactId } },
			journey: { documentId: { $eq: journeyId } },
		};

		// Add composition and channel filters if provided (for channel steps)
		if (compositionId) {
			filters.composition = { documentId: { $eq: compositionId } };
		}
		if (channelId) {
			filters.channel = { documentId: { $eq: channelId } };
		}

		const data = await adaptiveRateLimiter.execute(() =>
			journeyPassedStepService.find(env.JOURNEYS_STRAPI_API_TOKEN, {
				filters,
			}),
		);

		if (!data.success || !data.data) {
			logger.warn(
				{
					stepId,
					contactId,
					journeyId,
					errorMessage: data.errorMessage,
				},
				"Failed to check if step has been passed, assuming not passed",
			);
			// If we can't check, assume not passed to allow processing
			// This is safer than blocking legitimate processing
			return false;
		}

		const hasPassed = data.data.length > 0;
		
		if (hasPassed) {
			logger.debug(
				{
					stepId,
					contactId,
					journeyId,
					compositionId,
					channelId,
				},
				"Step has already been passed by contact (idempotency check)",
			);
		}

		return hasPassed;
	} catch (error: any) {
		logger.error(
			{
				err: error,
				stepId,
				contactId,
				journeyId,
			},
			"Error checking if step has been passed, assuming not passed",
		);
		// If there's an error checking, assume not passed to allow processing
		// This is safer than blocking legitimate processing
		return false;
	}
}
