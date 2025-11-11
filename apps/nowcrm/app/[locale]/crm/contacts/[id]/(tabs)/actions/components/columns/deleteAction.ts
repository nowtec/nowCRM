// actions/deleteContactAction.ts
"use server";

import { auth } from "@/auth";
import { DocumentId } from "@nowcrm/services";
import { actionsService, handleError, StandardResponse } from "@nowcrm/services/server";

export async function deleteAction(
	action: DocumentId,
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
		const response = await actionsService.delete(action, session.jwt);
		return response;
	} catch (error) {
		return handleError(error);
	}
}
