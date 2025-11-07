"use server";

import { auth } from "@/auth";
import { DocumentId, SurveyItem } from "@nowcrm/services";
import { handleError, StandardResponse, surveyItemsService } from "@nowcrm/services/server";


export async function getSurveyItemsBySurveyId(
	id: DocumentId,
): Promise<StandardResponse<SurveyItem[]>> {
	try {	

	const session = await auth();
	if (!session) return {
		data: null,
		status: 403,
		success: false,
	};
	const filters = {
		survey: { documentId: { $eq: id } },
	};

	const response = await surveyItemsService.find(session.jwt,{
		populate: ["survey", "file"],
		sort: ["id:desc"],
		pagination: {
			page: 1,
			pageSize: 100,
		},
		filters,
	});

	return response;
	} catch (error) {
		return handleError(error);
	}
}
