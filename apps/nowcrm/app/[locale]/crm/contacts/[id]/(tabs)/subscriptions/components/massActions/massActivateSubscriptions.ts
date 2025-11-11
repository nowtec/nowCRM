// actions/deleteContactAction.ts
"use server";

import { auth } from "@/auth";
import { DocumentId } from "@nowcrm/services";
import { handleError, StandardResponse } from "@nowcrm/services/server";
import { subscriptionsService } from "@nowcrm/services/server";
export async function massActivateSubscriptions(
	subscriptions: DocumentId[],
): Promise<StandardResponse<null>> {
	const session = await auth();
	if (!session) {
		return {
			data: null,
			status: 403,
			success: false,
		};
	}
	try {
		const unpublishPromises = subscriptions.map((id) =>
			subscriptionsService.update(id, { active: true }, session.jwt),
		);
		await Promise.all(unpublishPromises);
		return {
			data: null,
			status: 200,
			success: true,
		};
	} catch (error) {
		return handleError(error);
	}
}
