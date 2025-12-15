"use server";

import type { DocumentId } from "@nowcrm/services";
import {
	handleError,
	type StandardResponse,
	surveysService,
} from "@nowcrm/services/server";
import { auth } from "@/auth";

export async function deleteSurveyAction(
	surveyId: DocumentId,
): Promise<StandardResponse<null>> {
	try {
		const session = await auth();
		if (!session)
			return {
				data: null,
				status: 403,
				success: false,
				errorMessage: "Unauthorized",
			};

		const response = await surveysService.delete(surveyId, session.jwt);

		return response;
	} catch (error) {
		return handleError(error);
	}
}

