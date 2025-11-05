"use server";
import { auth } from "@/auth";
import { ContactTitle, DocumentId } from "@nowcrm/services";
import { contactTitlesService, handleError, StandardResponse } from "@nowcrm/services/server";
export async function updateContactTitle(
	id: DocumentId,
	name: string,
): Promise<StandardResponse<ContactTitle>> {
	const session = await auth();
	if (!session) {
		return {
			data: null,
			status: 403,
			success: false,
		};
	}
	try {
		const res = await contactTitlesService.update(id, {
			name: name,
		},session.jwt);
		return res;
	} catch (error) {
		return handleError(error);
	}
}
