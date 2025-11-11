// actions/deleteContactAction.ts
"use server";

import { auth } from "@/auth";
import { DocumentId } from "@nowcrm/services";
import { eventsService, handleError, StandardResponse } from "@nowcrm/services/server";
export async function massDeleteEvents(
	events: DocumentId[],
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
		const unpublishPromises = events.map((id) => eventsService.delete(id, session.jwt));
		await Promise.all(unpublishPromises);
		return {
			data: null,
			status: 200,
			success: true,
		};
	} catch (error: any) {
		return handleError(error);
	}
}
