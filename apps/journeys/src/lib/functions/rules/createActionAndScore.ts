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
} from "@nowcrm/services/server";
import { env } from "@/common/utils/env-config";

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
			const response = await actionScoreItemsService.create(
				{
					name: item.name,
					value: item.value,
					publishedAt: new Date(),
				},
				env.JOURNEYS_STRAPI_API_TOKEN,
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

	const data = {
		action_type: actionTypes.STEP_REACHED,
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

	const response = await actionsService.create(
		{
			...data,
			publishedAt: new Date(),
		},
		env.JOURNEYS_STRAPI_API_TOKEN,
	);

	if (!response.data || !response.success) {
		return ServiceResponse.failure(
			"Error in creating action. Probably strapi is down",
			null,
		);
	}

	return ServiceResponse.success("Succesufily create items", null);
}
