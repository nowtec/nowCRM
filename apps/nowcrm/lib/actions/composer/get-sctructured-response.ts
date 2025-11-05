// contactsapp/lib/actions/composer/getStructuredResponse.ts
"use server";
import { auth } from "@/auth";
import { StructuredResponseModel } from "@nowcrm/services";

import { compositionsService, handleError, StandardResponse } from "@nowcrm/services/server";

export async function structuredResponse(
	values: StructuredResponseModel,
): Promise<StandardResponse <{ result: any }>> {
	const session = await auth();
	if (!session) {
		return {
			data: null,
			status: 403,
			success: false,
		};
	}
	try {
		const res = await compositionsService.requestStructuredResponse(values);

		return res;
	} catch (error) {
		return handleError(error)
	}
}
