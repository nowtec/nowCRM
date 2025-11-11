// actions/deleteContactAction.ts
"use server";

import { auth } from "@/auth";
import { formsService, handleError, StandardResponse } from "@nowcrm/services/server";
import { DocumentId } from "@nowcrm/services";
export async function deleteFormAction(
	journeyId: DocumentId,
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
		const response = await formsService.delete(journeyId, session.jwt);
		return response;
	} catch (error) {
		return handleError(error);
	}
}
