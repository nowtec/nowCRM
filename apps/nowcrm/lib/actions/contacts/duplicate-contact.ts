"use server";

import { auth } from "@/auth";
import { DocumentId } from "@nowcrm/services";
import { contactsService, handleError, StandardResponse } from "@nowcrm/services/server";

export async function duplicateContactAction(
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
		const response = await contactsService.duplicate(contactId,session.jwt);
		return response;
	} catch (error) {
		return handleError(error);
	}
}
