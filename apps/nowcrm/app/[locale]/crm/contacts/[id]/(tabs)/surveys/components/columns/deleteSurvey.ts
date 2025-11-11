// actions/deleteContactAction.ts
"use server";

import { auth } from "@/auth";
import { DocumentId } from "@nowcrm/services";
import { handleError, StandardResponse } from "@nowcrm/services/server";
import { surveysService } from "@nowcrm/services/server";

export async function deleteSurveyAction(
	survey: DocumentId,
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
		const response = await surveysService.delete(survey, session.jwt);
		return response;
	} catch (error) {
		return handleError(error);
	}
}
