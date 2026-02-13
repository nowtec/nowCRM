import type { DocumentId } from "@nowcrm/services";
import { journeyPassedStepService } from "@nowcrm/services/server";
import { adaptiveRateLimiter } from "@/common/utils/adaptive-rate-limiter";
import { env } from "@/common/utils/env-config";

/**
 * Gets the latest step a contact has passed in a journey
 * Returns the stepId of the latest passed step, or null if contact hasn't passed any steps
 */
export async function getContactCurrentStep(
	contactId: DocumentId,
	journeyId: DocumentId,
): Promise<DocumentId | null> {
	try {
		const data = await adaptiveRateLimiter.execute(() =>
			journeyPassedStepService.find(env.JOURNEYS_STRAPI_API_TOKEN, {
				filters: {
					contact: { documentId: { $eq: contactId } },
					journey: { documentId: { $eq: journeyId } },
				},
				sort: ["createdAt:desc"],
				pagination: { limit: 1 },
				populate: {
					journey_step: {
						populate: {
							journey: true,
						},
					},
				},
			}),
		);

		if (!data.data || data.data.length === 0) {
			return null;
		}

		return data.data[0].journey_step?.documentId || null;
	} catch (error: any) {
		throw new Error(`Failed to get contact current step: ${error.message}`);
	}
}
