import {
	type DocumentId,
	type JourneyPassedStep,
	ServiceResponse,
} from "@nowcrm/services";
import { journeyPassedStepService } from "@nowcrm/services/server";
import { adaptiveRateLimiter } from "@/common/utils/adaptive-rate-limiter";
import { env } from "@/common/utils/env-config";
import { buildServiceUrl } from "./helpers/build-service-url";

export async function addJourneyPassedStep(
	stepId: DocumentId,
	contactId: DocumentId,
	journeyId: DocumentId,
	compositionId: DocumentId,
	channelId: DocumentId,
): Promise<ServiceResponse<JourneyPassedStep | null>> {
	const url = buildServiceUrl("journey-passed-steps");
	const data = await adaptiveRateLimiter.execute(
		() =>
			journeyPassedStepService.create(
				{
					contact: contactId,
					journey_step: stepId,
					journey: journeyId,
					composition: compositionId,
					channel: channelId,
					publishedAt: new Date(),
				},
				env.JOURNEYS_STRAPI_API_TOKEN,
			),
		`journeyPassedStepService.create - ${url}`,
	);
	if (!data.data)
		return ServiceResponse.failure(
			"Could not add passed step .Probably strapi is down",
			null,
		);

	return ServiceResponse.success("added passed step", data.data);
}
