// actions/deleteContactAction.ts
"use server";

import { auth } from "@/auth";
import { DocumentId } from "@nowcrm/services";
import { contactsService, handleError, StandardResponse } from "@nowcrm/services/server";

export async function deleteContactAction(
	contactId: DocumentId,
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
		const response = await contactsService.delete(contactId, session.jwt);
		return response;
	} catch (error) {
		return handleError(error);
	}
}
