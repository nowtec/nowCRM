// actions/deleteContactAction.ts
"use server";

import { auth } from "@/auth";
import { DocumentId } from "@nowcrm/services";
import { handleError, journeysService, StandardResponse } from "@nowcrm/services/server";

export async function deleteJourneyAction(
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
		const response = await journeysService.fullDelete(journeyId, session.jwt);
		return response;
	} catch (error) {
		return handleError(error);
	}
}
