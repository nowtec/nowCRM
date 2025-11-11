// contactsapp/lib/actions/contacts/createContact.ts
"use server";
import { auth } from "@/auth";
import { Contact, Form_Contact } from "@nowcrm/services";
import { contactsService, handleError, StandardResponse } from "@nowcrm/services/server";

export async function createContact(
	values: Partial<Form_Contact>,
): Promise<StandardResponse<Contact>> {
	const session = await auth();
	if (!session) {
		return {
			data: null,
			status: 403,
			success: false,
		};
	}
	try {
		const res = await contactsService.create(values,session.jwt);
		return res;
	} catch (error) {
		return handleError(error);
	}
}
