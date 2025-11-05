import type { DocumentId } from "@nowcrm/services";
import { journeyStepsService } from "@nowcrm/services/server";
import { env } from "@/common/utils/env-config";
import { createJob } from "../../../jobs/create-job";
import { getJourney } from "../../../lib/functions/helpers/getJourney";
import { passContactToNextStep } from "../../../lib/functions/passContactToNextStep";
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

	for (const step of res.responseObject.journey_steps) {
		if (!step.contacts) continue;
		//Ignore trigger cause they have own logic of creating jobs
		if (step.type === "trigger") continue;
		for (const contact of step.contacts) {
			const check = await journeyStepsService.checkStepAction(
				env.JOURNEYS_STRAPI_API_TOKEN,
				step.documentId,
				contact.documentId,
			);
			if (!check.data) {
				throw new Error(check.errorMessage);
			}
			if (check.data.find) {
				await passContactToNextStep(
					contact.documentId,
					step.documentId,
					journeyId,
					check.data.target_step,
				);
			}
			await createJob({
				contact: contact.documentId,
				journey: journeyId,
				type: step.type,
				journey_step: step.documentId,
				composition: step.composition?.documentId || undefined,
				channel: step.channel?.documentId || undefined,
				timing: step.timing,
			});
		}
	}
}
