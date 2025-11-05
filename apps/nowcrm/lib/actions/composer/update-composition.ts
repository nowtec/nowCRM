// actions/deleteContactAction.ts
"use server";
import { auth } from "@/auth";
import { Composition, DocumentId, Form_Composition } from "@nowcrm/services";
import { compositionsService, handleError, StandardResponse } from "@nowcrm/services/server";


export async function updateComposition(
	id: DocumentId,
	values: Partial<Form_Composition>,
): Promise<StandardResponse<Composition>> {
	const session = await auth();
	if (!session) {
		return {
			data: null,
			status: 403,
			success: false,
		};
	}
	try {
		const res = await compositionsService.update(id, values,session.jwt);
		return res;
	} catch (error) {
		return handleError(error)
	}
}
