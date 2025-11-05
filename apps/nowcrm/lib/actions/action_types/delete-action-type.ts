// actions/deleteContactAction.ts
"use server";

import { auth } from "@/auth";
import { DocumentId } from "@nowcrm/services";
import { actionTypeService, handleError, StandardResponse } from "@nowcrm/services/server";

export async function deleteActionType(
	actionTypeId: DocumentId,
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
		const response = await actionTypeService.delete(actionTypeId,session.jwt);
		return response;
	} catch (error) {
		return handleError(error);
	}
}
