// actions/deleteContactAction.ts
"use server";

import { auth } from "@/auth";
import { handleError, StandardResponse, subscriptionsService } from "@nowcrm/services/server";
import { DocumentId } from "@nowcrm/services";
export async function massDeleteSubscriptions(
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
			subscriptionsService.delete(id, session.jwt),
		);
		await Promise.all(unpublishPromises);
		return {
			data: null,
			status: 200,
			success: true,
		};
	} catch (error) {
		console.error("Error deleting Subscription:", error);
		return handleError(error);
	}
}
