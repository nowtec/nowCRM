// contactsapp/lib/actions/composer/createReference.ts
"use server";
import { auth } from "@/auth";
import { ReferenceComposition } from "@nowcrm/services";
import { compositionsService, handleError, StandardResponse } from "@nowcrm/services/server";

export async function createReference(
	values: ReferenceComposition,
): Promise<StandardResponse<{ result: string }>> {
	const session = await auth();
	if (!session) {
		return {
			data: null,
			status: 403,
			success: false,
		};
	}
	try {
		const res = await compositionsService.createReference(values);
		return res;
	} catch (error) {
		return handleError(error);
	}
}
