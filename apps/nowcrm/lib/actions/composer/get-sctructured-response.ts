// contactsapp/lib/actions/composer/getStructuredResponse.ts
"use server";
import type { StructuredResponseModel } from "@nowcrm/services";
import {
	composerService,
	handleError,
	type StandardResponse,
} from "@nowcrm/services/server";
import { auth } from "@/auth";

export async function structuredResponse(
	values: StructuredResponseModel,
): Promise<StandardResponse<{ result: any }>> {
	const session = await auth();
	if (!session) {
		return {
			data: null,
			status: 403,
			success: false,
		};
	}
	try {
		const res = await composerService.requestStructuredResponse(
			values,
			session.jwt,
		);

		return res;
	} catch (error) {
		return handleError(error);
	}
}
