// actions/deleteContactAction.ts
"use server";
import { auth } from "@/auth";
import { CompositionItem, DocumentId, Form_CompositionItem } from "@nowcrm/services";
import { compositionItemsService, handleError, StandardResponse } from "@nowcrm/services/server";

export async function updateCompositionItem(
	id: DocumentId,
	values: Partial<Form_CompositionItem>,
): Promise<StandardResponse<CompositionItem>> {
	const session = await auth();
	if (!session) {
		return {
			data: null,
			status: 403,
			success: false,
		};
	}
	try {
		const res = await compositionItemsService.update(id, values,session.jwt);
		return res;
	} catch (error) {
		return handleError(error);
	}
}
