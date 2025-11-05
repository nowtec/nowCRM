"use server";

import { auth } from "@/auth";
import { contactsService, handleError } from "@nowcrm/services/server";


export async function getContactsPreview(filters: any) {
	try {
	const session = await auth();
	if (!session) {
		return {
			success: false,
			status: 403,
			data: null,
		};
	}
	const result = await contactsService.find(session.jwt,{
		populate: "*",
		sort: ["id:desc"],
		pagination: { page: 1, pageSize: 5 },
		filters,
	});

	return result;
} catch (error) {
	return handleError(error);
}
}
