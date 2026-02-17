import {
	actionEntities,
	actionSources,
	actionTypes,
	type DocumentId,
	type JourneyStepRuleScore,
	ServiceResponse,
} from "@nowcrm/services";
import {
	actionScoreItemsService,
	actionsService,
	actionTypeService,
} from "@nowcrm/services/server";
import { adaptiveRateLimiter } from "@/common/utils/adaptive-rate-limiter";
import { env } from "@/common/utils/env-config";
import { buildServiceUrl } from "../helpers/build-service-url";

export async function createContactActionAndScore(
	stepId: DocumentId,
	contactId: DocumentId,
	totalScore?: number,
	scoreItems?: JourneyStepRuleScore[],
	target_step?: DocumentId,
): Promise<ServiceResponse<null>> {
	const createScoreItems = async (
		scoreItems?: JourneyStepRuleScore[],
	): Promise<ServiceResponse<DocumentId[] | null>> => {
		if (!scoreItems)
			return ServiceResponse.success("no score items to create", []);
		const scoreItemIds = [];
		for (const item of scoreItems) {
			const url = buildServiceUrl("action-score-items");
			const response = await adaptiveRateLimiter.execute(
				() =>
					actionScoreItemsService.create(
						{
							name: item.name,
							value: item.value,
							publishedAt: new Date(),
						},
						env.JOURNEYS_STRAPI_API_TOKEN,
					),
				`actionScoreItemsService.create - ${url}`,
			);
			if (!response.success || !response.data) {
				return ServiceResponse.failure(
					"Could not create score item, probably strapi is down",
					null,
				);
			}

			scoreItemIds.push(response.data.documentId);
		}

		return ServiceResponse.success(
			"succesufuly create score items",
			scoreItemIds,
		);
	};

	const scoreItemIds = await createScoreItems(scoreItems);
	if (scoreItemIds.responseObject === null) {
		return ServiceResponse.failure(
			`Error in creating score items ${scoreItemIds.message}`,
			null,
		);
	}

	const actionTypeUrl = buildServiceUrl("action-types", undefined, {
		filters: { name: { $eq: actionTypes.STEP_REACHED } },
	});
	const actionType = await adaptiveRateLimiter.execute(
		() =>
			actionTypeService.find(env.JOURNEYS_STRAPI_API_TOKEN, {
				filters: { name: { $eq: actionTypes.STEP_REACHED } },
			}),
		`actionTypeService.find (createContactActionAndScore) - ${actionTypeUrl}`,
	);
	if (!actionType.data || actionType.data.length === 0) {
		return ServiceResponse.failure(
			"Error in finding action type. Probably strapi is down",
			null,
		);
	}

	const data = {
		action_type: actionType.data[0].documentId,
		entity: actionEntities.JOURNEY_STEPS,
		value: totalScore?.toString() || "0",
		external_id: stepId.toString(),
		source: actionSources.JOURNEY_STEP,
		contact: contactId,
		score_items: { set: scoreItemIds.responseObject },
		journey_step: stepId,
		payload: JSON.stringify({
			action_type: actionTypes.STEP_REACHED,
			entity: actionEntities.JOURNEY_STEPS,
			value: totalScore?.toString() || "0",
			external_id: stepId.toString(),
			source: actionSources.JOURNEY_STEP,
			contact: contactId,
			score_items: scoreItemIds,
			journey_step: stepId,
			target_step: target_step,
		}),
	};

	const createActionUrl = buildServiceUrl("actions");
	const response = await adaptiveRateLimiter.execute(
		() =>
			actionsService.create(
				{
					...data,
					publishedAt: new Date(),
				},
				env.JOURNEYS_STRAPI_API_TOKEN,
			),
		`actionsService.create (createContactActionAndScore) - ${createActionUrl}`,
	);
	if (!response.data || !response.success) {
		return ServiceResponse.failure(
			"Error in creating action. Probably strapi is down",
			null,
		);
	}

	return ServiceResponse.success("Succesufily create items", null);
}
