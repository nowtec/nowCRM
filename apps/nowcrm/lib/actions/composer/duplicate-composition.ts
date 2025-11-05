"use server";

import { auth } from "@/auth";
import { DocumentId } from "@nowcrm/services";
import { compositionsService, handleError, StandardResponse } from "@nowcrm/services/server";

export async function duplicateCompositionAction(
	compositionId: DocumentId,
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
		const response = await compositionsService.duplicate(compositionId,session.jwt);
		return response;
	} catch (error) {
		return handleError(error);
	}
}
