// actions/deleteContactAction.ts
"use server";

import { auth } from "@/auth";
import { DocumentId } from "@nowcrm/services";
import { handleError, StandardResponse } from "@nowcrm/services/server";
import { tasksService } from "@nowcrm/services/server";

export async function deleteTaskAction(
	task: DocumentId,
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
		const response = await tasksService.delete(task, session.jwt);
		return response;
	} catch (error) {
		return handleError(error);
	}
}
