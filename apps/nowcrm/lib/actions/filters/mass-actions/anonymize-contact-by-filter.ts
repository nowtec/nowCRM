// actions/deleteContactAction.ts
"use server";
import {
	dalService,
	handleError,
	type StandardResponse,
} from "@nowcrm/services/server";
import { auth } from "@/auth";
export async function anonymizeContactsByFilters(payload: {
	entity: string;
	searchMask: any;
	mass_action: string;
}): Promise<StandardResponse<any>> {
	const session = await auth();
	if (!session) {
		return {
			data: null,
			status: 403,
			success: false,
		};
	}

	try {
		const res = await dalService.anonymizeContactsByFilters(
			payload,
			session.jwt,
		);
		return res;
	} catch (error) {
		return handleError(error);
	}
}
