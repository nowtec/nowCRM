// actions/deleteContactAction.ts
"use server";

import { auth } from "@/auth";
import { DocumentId } from "@nowcrm/services";
import { contactDocumentsService, handleError, StandardResponse } from "@nowcrm/services/server";
export async function deleteAction(
	document: DocumentId,
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
		const response = await contactDocumentsService.delete(document, session.jwt);
		return response;
	} catch (error) {
		return handleError(error);
	}
}
