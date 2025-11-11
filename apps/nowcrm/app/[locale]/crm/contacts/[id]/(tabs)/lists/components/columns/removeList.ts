// actions/deleteContactAction.ts
"use server";

import { auth } from "@/auth";
import { DocumentId, List } from "@nowcrm/services";
import { handleError, listsService, StandardResponse } from "@nowcrm/services/server";

export async function deleteListAction(
	listId: DocumentId,
	contactId: DocumentId,
): Promise<StandardResponse<List>> {
	const session = await auth();
	if (!session) {
		return {
			data: null,
			status: 403,
			success: false,
		};
	}
	try {
		const response = await listsService.update(listId, {
			contacts: { disconnect: [contactId] },
		}, session.jwt);

		return response;
	} catch (error) {
		return handleError(error);
	}
}
