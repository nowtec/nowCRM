// actions/deleteContactAction.ts
"use server";
import type { DocumentId } from "@nowcrm/services";
import {
	handleError,
	listsService,
	type StandardResponse,
} from "@nowcrm/services/server";
import { auth } from "@/auth";

export async function getListCount(
	listId: DocumentId,
): Promise<StandardResponse<{ count: number }>> {
	const session = await auth();
	if (!session) {
		return {
			data: null,
			status: 403,
			success: false,
		};
	}
	try {
		const res = await listsService.countContacts(listId, session.jwt);
		return res;
	} catch (error) {
		return handleError(error);
	}
}
