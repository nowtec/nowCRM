import {
	actionEntities,
	actionSources,
	actionTypes,
	type DocumentId,
} from "@nowcrm/services";
import { actionsService, actionTypeService } from "@nowcrm/services/server";
import { adaptiveRateLimiter } from "@/common/utils/adaptive-rate-limiter";
import { env } from "@/common/utils/env-config";
import { buildServiceUrl } from "../helpers/build-service-url";

export async function createFinishActions(
	contactId: DocumentId,
	journeyId: DocumentId,
): Promise<void> {
	const actionTypeUrl = buildServiceUrl("action-types", undefined, {
		filters: { name: { $eq: actionTypes.JOURNEY_FINISHED } },
	});
	const actionType = await adaptiveRateLimiter.execute(
		() =>
			actionTypeService.find(env.JOURNEYS_STRAPI_API_TOKEN, {
				filters: { name: { $eq: actionTypes.JOURNEY_FINISHED } },
			}),
		`actionTypeService.find (createFinishActions) - ${actionTypeUrl}`,
	);
	if (!actionType.data || actionType.data.length === 0) {
		throw new Error("Error in finding action type. Probably strapi is down");
	}
	const data = {
		action_type: actionType.data[0].documentId,
		entity: actionEntities.JOURNEY,
		value: "0",
		external_id: journeyId.toString(),
		source: actionSources.JOURNEY,
		contact: contactId,
		payload: JSON.stringify({
			action_type: actionTypes.JOURNEY_FINISHED,
			entity: actionEntities.JOURNEY,
			value: "0",
			external_id: journeyId,
			source: actionSources.JOURNEY,
			contact: contactId,
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
		`actionsService.create (createFinishActions) - ${createActionUrl}`,
	);

	if (!response.data || !response.success) {
		throw new Error(
			`Error during creating finish action ${response.errorMessage}`,
		);
	}

	return;
}
