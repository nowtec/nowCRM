"use server";
import { auth } from "@/auth";
import { DocumentId } from "@nowcrm/services";
import { contactTitlesService, handleError, StandardResponse } from "@nowcrm/services/server";

export async function deleteContactTitleAction(
	id: DocumentId,
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
		const res = await contactTitlesService.delete(id,session.jwt);
		return res;
	} catch (error) {
		return handleError(error);
	}
}
