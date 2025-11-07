// actions/deleteContactAction.ts
"use server";
import { auth } from "@/auth";
import { Form_Task, Task } from "@nowcrm/services";
import { handleError, StandardResponse, tasksService } from "@nowcrm/services/server";

export async function createTask(
	values: Form_Task,
): Promise<StandardResponse<Task>> {
	const session = await auth();
	if (!session) {
		return {
			data: null,
			status: 403,
			success: false,
		};
	}
	try {
		const res = await tasksService.create(values, session.jwt);
		return res;
	} catch (error) {
		return handleError(error);
	}
}
