// actions/deleteContactAction.ts
"use server";
import { auth } from "@/auth";
import { Composition, Form_Composition } from "@nowcrm/services";
import { compositionsService, handleError, StandardResponse } from "@nowcrm/services/server";

export async function createComposition(
	values: Form_Composition,
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
		const res = await compositionsService.create(values,session.jwt);
		return res;
	} catch (error) {
		return handleError(error);
	}
}
