// actions/deleteContactAction.ts
"use server";
import type { createAdditionalComposition } from "@nowcrm/services";
import {
	compositionsService,
	handleError,
	type StandardResponse,
} from "@nowcrm/services/server";
import { auth } from "@/auth";
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
		const res = await compositionsService.regenerateItemResult(
			values,
			session.jwt,
		);
		return res;
	} catch (error) {
		return handleError(error);
	}
}
