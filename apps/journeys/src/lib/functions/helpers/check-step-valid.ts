import type { DocumentId } from "@nowcrm/services";
import { journeyStepsService } from "@nowcrm/services/server";
import { env } from "@/common/utils/env-config";

/**
 * Checks if a step is valid for a contact in a journey
 * This is a lightweight validation that only checks:
 * 1. Step exists and has required fields (composition for channel/publish steps)
 *
 * Note: The check for "contact has already passed this step" is done in journey-processor
 * to avoid duplicate API calls. This function focuses on step structure validation.
 *
 * Returns { valid: boolean, reason?: string }
 */
export async function checkStepValid(
	_contactId: DocumentId,
	_journeyId: DocumentId,
	stepId: DocumentId,
	stepData?: {
		type: string;
		composition?: { documentId: DocumentId } | null;
	} | null,
): Promise<{ valid: boolean; reason?: string }> {
	try {
		let stepType: string;
		let hasComposition: boolean;

		// If step data is provided, use it to avoid an extra API call
		if (stepData) {
			stepType = stepData.type;
			hasComposition = !!stepData.composition;
		} else {
			// Fallback: fetch step if not provided (should be rare)
			const step = await journeyStepsService.findOne(
				stepId,
				env.JOURNEYS_STRAPI_API_TOKEN,
				{
					populate: {
						composition: true,
					},
				},
			);

			if (!step.data) {
				return {
					valid: false,
					reason: "Step not found",
				};
			}

			stepType = step.data.type;
			hasComposition = !!step.data.composition;
		}

		// Only "channel" and "publish" step types require a composition
		// "wait" and "scheduler-trigger" steps don't need compositions
		const requiresComposition =
			stepType === "channel" || stepType === "publish";

		if (requiresComposition && !hasComposition) {
			return {
				valid: false,
				reason: `Step type "${stepType}" requires a composition but none was found`,
			};
		}

		// Basic validation passed
		// Note: We don't check checkPassedStep or getContactCurrentStep here because
		// those checks are already done in journey-processor.ts to avoid duplicate API calls
		return { valid: true };
	} catch (error: any) {
		return {
			valid: false,
			reason: `Error checking step validity: ${error.message}`,
		};
	}
}
