// massAddContactsToList.ts
"use server";

import { auth } from "@/auth";
import { DocumentId } from "@nowcrm/services";
import { listsService, StandardResponse } from "@nowcrm/services/server";

export async function massAddContactsToList(
	contacts: DocumentId[],
	listId: DocumentId,
): Promise<StandardResponse<null>> {
	console.log(
		"[Server] massAddContactsToList called with contacts:",
		contacts,
		"listId:",
		listId,
	);

	const session = await auth();
	if (!session) {
		console.warn("[Server] No session, returning 403");
		return {
			data: null,
			status: 403,
			success: false,
		};
	}

	try {
		const res = await listsService.update(listId, {
			contacts: { connect: contacts },
		}, session.jwt);

		if (!res.success) {
			console.warn("[Server] Failed to add contacts to list:", res);
			return {
				data: null,
				status: 500,
				success: false,
				errorMessage: "Some contacts could not be added to the list",
			};
		}

		console.log("[Server] Contacts added to list successfully");

		return {
			data: null,
			status: 200,
			success: true,
		};
	} catch (error: any) {
		console.error("[Server] Error adding contacts to list:", error);
		return {
			data: null,
			status: error.status ?? 500,
			success: false,
			errorMessage: error.message,
		};
	}
}
