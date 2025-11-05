import {
	type DocumentId,
	type JourneyStep,
	ServiceResponse,
} from "@nowcrm/services";
import { journeyStepsService } from "@nowcrm/services/server";
import { env } from "@/common/utils/env-config";

export async function getJourneyStep(
	id: DocumentId,
): Promise<ServiceResponse<JourneyStep | null>> {
	const data = await journeyStepsService.findOne(
		id,
		env.JOURNEYS_STRAPI_API_TOKEN,
		{
			populate: {
				contacts: true,
				channel: true,
				journey: true,
				composition: true,
				connections_from_this_step: {
					sort: [{ priority: "asc" }],
					populate: {
						journey_step_rules: {
							populate: { journey_step_rule_scores: true },
						},
						target_step: {
							populate: {
								channel: true,
								composition: true,
							},
						},
					},
				},
				identity: true,
			},
		},
	);
	if (!data.data)
		return ServiceResponse.failure(
			"Could not get journey step.Probably strapi is down",
			null,
		);

	if (!Object.hasOwn(data.data, "contacts")) {
		return ServiceResponse.failure(
			"Strapi token badly configured for Journeys service (contacts)",
			null,
		);
	}
	if (!Object.hasOwn(data.data, "channel")) {
		return ServiceResponse.failure(
			"Strapi token badly configured for Journeys service (channel)",
			null,
		);
	}
	if (!Object.hasOwn(data.data, "composition")) {
		return ServiceResponse.failure(
			"Strapi token badly configured for Journeys service (composition)",
			null,
		);
	}
	if (!Object.hasOwn(data.data, "identity")) {
		return ServiceResponse.failure(
			"Strapi token badly configured for Journeys service (identity)",
			null,
		);
	}
	if (!Object.hasOwn(data.data, "connections_from_this_step")) {
		return ServiceResponse.failure(
			"Strapi token badly configured for Journeys service (connections from this step)",
			null,
		);
	}

	if (
		data.data.connections_from_this_step &&
		data.data.connections_from_this_step.length > 0
	) {
		if (
			!Object.hasOwn(
				data.data.connections_from_this_step[0],
				"journey_step_rules",
			)
		) {
			return ServiceResponse.failure(
				"Strapi token badly configured for Journeys service (journey step rules)",
				null,
			);
		}

		if (data.data.connections_from_this_step[0].journey_step_rules.length > 0)
			if (
				!Object.hasOwn(
					data.data.connections_from_this_step[0].journey_step_rules[0],
					"journey_step_rule_scores",
				)
			) {
				return ServiceResponse.failure(
					"Strapi token badly configured for Journeys service (journey step rule scores)",
					null,
				);
			}
	}

	return ServiceResponse.success("Fetched journey step", data.data);
}
