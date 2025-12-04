import type { DocumentId } from "@nowcrm/services";
import { journeyStepsService } from "@nowcrm/services/server";
import { env } from "@/common/utils/env-config";
import { createJob } from "../../../jobs/create-job";
import { getJourney } from "../../../lib/functions/helpers/get-jouney";
import { passContactToNextStep } from "../../../lib/functions/pass-contact-to-next-step";
import { logger } from "../../../logger";

/**
 * Journey processing is needed for
 */
export async function processJourneyMessage({
	journeyId,
}: {
	journeyId: DocumentId;
}) {
	logger.info(`Processing journey ${journeyId}`);
	const res = await getJourney(journeyId);
	if (!res.success || !res.responseObject?.journey_steps)
		throw new Error(res.message);

	// Process steps sequentially but contacts in parallel to reduce N+1 queries
	for (const step of res.responseObject.journey_steps) {
		if (!step.contacts) continue;
		//Ignore trigger cause they have own logic of creating jobs
		if (step.type === "trigger") continue;

		// Process contacts in parallel batches to reduce sequential awaits
		const contactPromises = step.contacts.map(async (contact) => {
			try {
				// Check if contact has already processed this step
				const check = await journeyStepsService.checkStepAction(
					env.JOURNEYS_STRAPI_API_TOKEN,
					step.documentId,
					contact.documentId,
				);
				if (!check.data) {
					throw new Error(check.errorMessage);
				}
				if (check.data.find) {
					// Contact already processed this step, move to next step
					await passContactToNextStep(
						contact.documentId,
						step.documentId,
						journeyId,
						check.data.target_step,
					);
					// Skip creating job for this step since it's already been processed
					return null;
				}

				// Create job with skipValidation=true since we already did the checks above
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

		if (successful > 0) {
			logger.info(
				`Processed ${successful} contacts for step ${step.documentId} in journey ${journeyId}`,
			);
		}
	}
}
