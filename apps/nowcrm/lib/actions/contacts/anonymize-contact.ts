"use server";

import { auth } from "@/auth";
import { Contact, DocumentId } from "@nowcrm/services";
import { contactsService, handleError, StandardResponse } from "@nowcrm/services/server";

export async function anonymizeContact(
	contactId: DocumentId,
): Promise<StandardResponse<Contact>> {
	const session = await auth();
	if (!session) {
		return {
			data: null,
			status: 403,
			success: false,
			errorMessage: "Unauthorized access",
		};
	}

	try {
		const res = await contactsService.anonymizeContact(contactId,session.jwt);

		return res;
	} catch (error) {
		return handleError(error);
	}
}
