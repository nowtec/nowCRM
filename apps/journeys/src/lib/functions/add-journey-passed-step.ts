import {
	type DocumentId,
	type JourneyPassedStep,
	ServiceResponse,
} from "@nowcrm/services";
import { journeyPassedStepService } from "@nowcrm/services/server";
import { env } from "@/common/utils/env-config";

export async function addJourneyPassedStep(
	stepId: DocumentId,
	contactId: DocumentId,
	journeyId: DocumentId,
	compositionId: DocumentId,
	channelId: DocumentId,
): Promise<ServiceResponse<JourneyPassedStep | null>> {
	const data = await journeyPassedStepService.create(
		{
			contact: contactId,
			journey_step: stepId,
			journey: journeyId,
			composition: compositionId,
			channel: channelId,
			publishedAt: new Date(),
		},
		env.JOURNEYS_STRAPI_API_TOKEN,
	);
	if (!data.data)
		return ServiceResponse.failure(
			"Could not add passed step .Probably strapi is down",
			null,
		);

	return ServiceResponse.success("added passed step", data.data);
}
