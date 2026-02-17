import {
	type DocumentId,
	type JourneyStep,
	ServiceResponse,
} from "@nowcrm/services";
import { journeyStepsService } from "@nowcrm/services/server";
import { adaptiveRateLimiter } from "@/common/utils/adaptive-rate-limiter";
import { env } from "@/common/utils/env-config";
import { buildJourneyStepUrl } from "./build-service-url";

export async function getJourneyStep(
	id: DocumentId,
): Promise<ServiceResponse<JourneyStep | null>> {
	const url = buildJourneyStepUrl(id);
	const data = await adaptiveRateLimiter.execute(
		() =>
			journeyStepsService.findOne(id, env.JOURNEYS_STRAPI_API_TOKEN, {
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
			}),
		`journeyStepsService.findOne - ${url}`,
	);
	
	// Check if step was deleted (404)
	// Check both response.status and error structure from Strapi
	if (!data.success) {
		const isNotFound =
			data.status === 404 ||
			data.errorMessage?.toLowerCase().includes("404") ||
			data.errorMessage?.toLowerCase().includes("not found") ||
			data.errorMessage?.toLowerCase().includes("notfounderror");
		
		if (isNotFound) {
			return ServiceResponse.failure(
				"Journey step not found (deleted)",
				null,
			);
		}
	}
	
	if (!data.data) {
		return ServiceResponse.failure(
			"Could not get journey step.Probably strapi is down",
			null,
		);
	}

	if (!Object.hasOwn(data.data, "contacts")) {
		return ServiceResponse.failure(
			"Strapi token badly configured for Journeys service (contacts)",
			null,
		);
	}

	// Only "channel" and "publish" step types require channel and composition
	// Identity is only required for email channels
	const stepType = data.data.type;
	const requiresChannelAndComposition =
		stepType === "channel" || stepType === "publish";

	if (requiresChannelAndComposition) {
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
		// Identity is only required for email channels, but we check for the property existence
		// The actual validation happens in processJob
		if (!Object.hasOwn(data.data, "identity")) {
			return ServiceResponse.failure(
				"Strapi token badly configured for Journeys service (identity)",
				null,
			);
		}
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
