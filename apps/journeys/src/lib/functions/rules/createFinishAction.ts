import {
	actionEntities,
	actionSources,
	actionTypes,
	type DocumentId,
} from "@nowcrm/services";
import { actionsService } from "@nowcrm/services/server";
import { env } from "@/common/utils/env-config";

export async function createFinishActions(
	contactId: DocumentId,
	journeyId: DocumentId,
): Promise<void> {
	const data = {
		action_type: actionTypes.JOURNEY_FINISHED,
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

	const response = await actionsService.create(
		{
			...data,
			publishedAt: new Date(),
		},
		env.JOURNEYS_STRAPI_API_TOKEN,
	);

	if (!response.data || !response.success) {
		throw new Error(
			`Error during creating finish action ${response.errorMessage}`,
		);
	}

	return;
}
