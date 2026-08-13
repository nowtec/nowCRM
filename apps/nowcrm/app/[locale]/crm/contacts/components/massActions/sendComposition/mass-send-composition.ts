// actions/deleteContactAction.ts
"use server";

import type { DocumentId, StandardResponse } from "@nowcrm/services";
import { composerService, handleError } from "@nowcrm/services/server";
import { auth } from "@/auth";

export async function MassSendComposition(
	contactIds: DocumentId[],
	compositionId: DocumentId,
	channelNames: string[],
	subject: string,
	from: string,
	interval: number,
): Promise<StandardResponse<any>> {
	const session = await auth();
	if (!session) {
		return {
			data: null,
			status: 403,
			success: false,
		};
	}

	try {
		return await composerService.sendCompositionByIds(
			contactIds,
			compositionId,
			channelNames,
			subject,
			from,
			interval,
			session.jwt,
		);
	} catch (error) {
		return handleError(error);
	}
}
