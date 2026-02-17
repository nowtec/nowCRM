import {
	type DocumentId,
	type Journey,
	ServiceResponse,
} from "@nowcrm/services";
import { journeysService } from "@nowcrm/services/server";
import { adaptiveRateLimiter } from "@/common/utils/adaptive-rate-limiter";
import { env } from "@/common/utils/env-config";

export async function getJourney(
	id: DocumentId,
): Promise<ServiceResponse<Journey | null>> {
	const data = await adaptiveRateLimiter.execute(() =>
		journeysService.findOne(id, env.JOURNEYS_STRAPI_API_TOKEN, {
			populate: {
				journey_steps: {
					populate: {
						contacts: true,
						channel: true,
						composition: true,
					},
				},
			},
		}),
	);
	
	// Check if journey was deleted (404)
	// Check both response.status and error structure from Strapi
	if (!data.success) {
		const isNotFound =
			data.status === 404 ||
			data.errorMessage?.toLowerCase().includes("404") ||
			data.errorMessage?.toLowerCase().includes("not found") ||
			data.errorMessage?.toLowerCase().includes("notfounderror");
		
		if (isNotFound) {
			return ServiceResponse.failure(
				"Journey not found (deleted)",
				null,
			);
		}
	}
	
	if (!data.data)
		return ServiceResponse.failure(
			"Could not get journey .Probably strapi is down",
			null,
		);

	if (!Object.hasOwn(data.data, "journey_steps")) {
		return ServiceResponse.failure(
			"Strapi token badly configured for Journeys service (Journey steps)",
			null,
		);
	}
	if (data.data.journey_steps.length > 0) {
		if (!Object.hasOwn(data.data.journey_steps[0], "contacts")) {
			return ServiceResponse.failure(
				"Strapi token badly configured for Journeys service (Contacts)",
				null,
			);
		}
		if (!Object.hasOwn(data.data.journey_steps[0], "channel")) {
			return ServiceResponse.failure(
				"Strapi token badly configured for Journeys service (Channel)",
				null,
			);
		}
		if (!Object.hasOwn(data.data.journey_steps[0], "composition")) {
			return ServiceResponse.failure(
				"Strapi token badly configured for Journeys service (composition)",
				null,
			);
		}
	}
	return ServiceResponse.success("Fetched journeys", data.data);
}
