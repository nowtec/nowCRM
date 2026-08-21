// actions/deleteContactAction.ts
"use server";
import type { DocumentId } from "@nowcrm/services";
import {
	dalService,
	handleError,
	type StandardResponse,
} from "@nowcrm/services/server";
import { auth } from "@/auth";
export async function UpdateSubscriptionContactsByFilters(
	filters: Record<string, any>,
	channelId: DocumentId,
	isSubscribe: boolean,
	addEvent?: boolean,
): Promise<StandardResponse<any>> {
	const session = await auth();
	if (!session) {
		return {
			data: null,
			status: 403,
			success: false,
		};
	}

	try {
		const res = await dalService.updateSubscriptionContactsByFilters(
			filters,
			channelId,
			isSubscribe,
			session.jwt,
			addEvent,
		);
		return res;
	} catch (error) {
		return handleError(error);
	}
}
