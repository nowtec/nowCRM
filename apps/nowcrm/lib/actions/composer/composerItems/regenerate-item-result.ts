// actions/deleteContactAction.ts
"use server";
import { auth } from "@/auth";
import { createAdditionalComposition } from "@nowcrm/services";
import { compositionsService, handleError, StandardResponse } from "@nowcrm/services/server";
export async function regenerateItemResult(
	values: createAdditionalComposition,
): Promise<StandardResponse<string>> {
	const session = await auth();
	if (!session) {
		return {
			data: null,
			status: 403,
			success: false,
		};
	}
	try {
const res = await compositionsService.regenerateItemResult(values);
		return res;
	} catch (error) {
		return handleError(error);
	}
}
