// actions/deleteContactAction.ts
"use server";
import type { DocumentId } from "@nowcrm/services";
import {
	dalService,
	handleError,
	type StandardResponse,
} from "@nowcrm/services/server";
import { auth } from "@/auth";
export async function addContactsToOrganizationByFilters(
	filters: Record<string, any>,
	organizationId: DocumentId,
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
		const res = await dalService.addContactsToOrganizationByFilters(
			filters,
			organizationId,
			session.jwt,
		);
		return res;
	} catch (error) {
		return handleError(error);
	}
}
