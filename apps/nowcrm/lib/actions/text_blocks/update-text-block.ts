// actions/deleteContactAction.ts
"use server";
import { auth } from "@/auth";
import { DocumentId, Form_TextBlock, TextBlock } from "@nowcrm/services";
import { handleError, StandardResponse, textblocksService } from "@nowcrm/services/server";

export async function updateTextBlock(
	id: DocumentId,
	values: Partial<Form_TextBlock>,
): Promise<StandardResponse<TextBlock>> {
	const session = await auth();
	if (!session) {
		return {
			data: null,
			status: 403,
			success: false,
		};
	}
	try {
		const res = await textblocksService.update(id, values, session.jwt);
		return res;
	} catch (error) {
		return handleError(error);
	}
}
