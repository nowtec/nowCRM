// actions/deleteContactAction.ts
"use server";
import { auth } from "@/auth";

import { activityLogsService, handleError, StandardResponse } from "@nowcrm/services/server";
import { type ActivityLog, type Form_ActivityLog } from "@nowcrm/services";

export async function createActivityLog(
	values: Partial<Form_ActivityLog>,
): Promise<StandardResponse<ActivityLog>> {
	const session = await auth();
	if (!session) {
		return {
			data: null,
			status: 403,
			success: false,
		};
	}

	try {
		const res = await activityLogsService.create({
			...values,
			user: session.user.strapi_id,
		},session.jwt);
		return res;
	} catch (error) {
		return handleError(error);
	}
}
