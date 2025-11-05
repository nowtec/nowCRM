import {
	type DocumentId,
	type Journey,
	ServiceResponse,
} from "@nowcrm/services";
import { journeysService } from "@nowcrm/services/server";
import { env } from "@/common/utils/env-config";

export async function getJourney(
	id: DocumentId,
): Promise<ServiceResponse<Journey | null>> {
	const data = await journeysService.findOne(
		id,
		env.JOURNEYS_STRAPI_API_TOKEN,
		{
			populate: {
				journey_steps: {
					populate: {
						contacts: true,
						channel: true,
						composition: true,
					},
				},
			},
		},
	);
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
