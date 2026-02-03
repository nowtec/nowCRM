"use server";

import type { DocumentId } from "@nowcrm/services";
import {
	formsService,
	handleError,
	type StandardResponse,
} from "@nowcrm/services/server";
import { auth } from "@/auth";

export async function exportFormResults(
	formId: DocumentId,
): Promise<StandardResponse<string>> {
	const session = await auth();
	if (!session) {
		return {
			data: null,
			status: 403,
			success: false,
		};
	}
	try {
		return await formsService.exportResults(formId, session.jwt);
	} catch (error) {
		return handleError(error);
	}
}
