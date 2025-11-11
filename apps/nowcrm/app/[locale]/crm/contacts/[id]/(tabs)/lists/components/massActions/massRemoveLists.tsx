// actions/deleteContactAction.ts
"use server";

import { auth } from "@/auth";
import { handleError, StandardResponse } from "@nowcrm/services/server";
import { DocumentId } from "@nowcrm/services";
import { listsService } from "@nowcrm/services/server";
export async function MassRemoveLists(
	lists: DocumentId[],
	contactId: DocumentId,
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
		lists.map(
			async (id) =>
				await listsService.update(id, {
					contacts: { disconnect: [contactId] },
				}, session.jwt),
		);
		return {
			data: null,
			status: 200,
			success: true,
		};
	} catch (error) {
		return handleError(error);
	}
}
