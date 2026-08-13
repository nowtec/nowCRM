// contactsapp/lib/actions/composer/createReference.ts
"use server";
import type { ReferenceComposition } from "@nowcrm/services";
import {
	compositionsService,
	handleError,
	type StandardResponse,
} from "@nowcrm/services/server";
import { auth } from "@/auth";

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
		const res = await compositionsService.createReference(values, session.jwt);
		return res;
	} catch (error) {
		return handleError(error);
	}
}
