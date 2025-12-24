// actions/deleteContactAction.ts
"use server";
import type { DocumentId, FormEntity } from "@nowcrm/services";
import {
	formsService,
	handleError,
	type StandardResponse,
} from "@nowcrm/services/server";
import { auth } from "@/auth";

export async function activateForm(
	status: boolean,
	formId: DocumentId,
): Promise<StandardResponse<FormEntity>> {
	const session = await auth();
	if (!session) {
		return {
			data: null,
			status: 403,
			success: false,
		};
	}
	try {
		const res = await formsService.update(
			formId,
			{ active: status },
			session.jwt,
		);
		return res;
	} catch (error) {
		return handleError(error);
	}
}
