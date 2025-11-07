// actions/deleteContactAction.ts
"use server";
import { auth } from "@/auth";
import { DocumentId, UnipileIdentity } from "@nowcrm/services";
import { handleError, StandardResponse, unipileIdentitiesService } from "@nowcrm/services/server";

export async function getUnipileIdentity(
	id: DocumentId,
): Promise<StandardResponse<UnipileIdentity>> {
	const session = await auth();
	if (!session) {
		return {
			data: null,
			status: 403,
			success: false,
		};
	}
	try {
		const identity = await unipileIdentitiesService.findOne(id, session.jwt);

		return identity;
	} catch (error) {
		return handleError(error);
	}
}
