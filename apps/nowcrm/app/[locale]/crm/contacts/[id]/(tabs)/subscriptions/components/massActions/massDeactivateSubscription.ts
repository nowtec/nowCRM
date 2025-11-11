// actions/deleteContactAction.ts
"use server";

import { auth } from "@/auth";
import { handleError, StandardResponse } from "@nowcrm/services/server";
import { DocumentId } from "@nowcrm/services";
import { subscriptionsService } from "@nowcrm/services/server";

export async function massDeactivateSubscriptions(
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
			subscriptionsService.update(id, { active: false }, session.jwt),
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
