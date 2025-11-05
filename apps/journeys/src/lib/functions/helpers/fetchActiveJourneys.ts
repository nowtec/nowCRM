import type { Journey } from "@nowcrm/services";
import { journeysService } from "@nowcrm/services/server";
import { env } from "@/common/utils/env-config";

export async function fetchActiveJourneys(): Promise<Journey[]> {
	const response = await journeysService.find(env.JOURNEYS_STRAPI_API_TOKEN, {
		filters: {
			active: { $eq: true },
		},
		populate: {
			journey_steps: true,
		},
	});

	if (!response.data || !response.success) {
		throw new Error(
			`Eror during fetching journeys, Probably strapi is down ${response.errorMessage}`,
		);
	}
	if (response.data.length > 0) {
		if (!Object.hasOwn(response.data[0], "journey_steps")) {
			throw new Error(
				"Strapi token badly configured for Journeys service (journey step)",
			);
		}
	}
	return response.data;
}
