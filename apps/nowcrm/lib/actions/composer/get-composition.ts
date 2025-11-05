// actions/deleteContactAction.ts
"use server";
import { auth } from "@/auth";
import { Composition, DocumentId } from "@nowcrm/services";
import { compositionsService, handleError, StandardResponse } from "@nowcrm/services/server";

export async function getComposition(
	id: DocumentId,
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
		const identity = await compositionsService.findOne(id,session.jwt, {
			populate: {
				"*": true,
				composition_items: {
					populate: "channel",
				},
			},
		});
		return identity;
	} catch (error) {
		return handleError(error);
	}
}
