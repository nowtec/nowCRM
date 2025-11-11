// actions/deleteContactAction.ts
"use server";

import { auth } from "@/auth";
import { DocumentId } from "@nowcrm/services";
import { activityLogsService, handleError, StandardResponse } from "@nowcrm/services/server";

export async function deleteActivityLogAction(
	activity_log: DocumentId,
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
		const response = await activityLogsService.delete(activity_log, session.jwt);
		return response;
	} catch (error) {
		return handleError(error);
	}
}
