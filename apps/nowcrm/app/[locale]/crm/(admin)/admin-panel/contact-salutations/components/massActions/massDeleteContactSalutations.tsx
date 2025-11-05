"use server";

import { deleteContactSalutationAction } from "@/lib/actions/contact-salutations/delete-contact-salutation";

export async function MassDeleteContactSalutations(
	contactSalutationIds: number[],
) {
	try {
		const deletePromises = contactSalutationIds.map((id) =>
			deleteContactSalutationAction(id),
		);
		await Promise.all(deletePromises);
		return { success: true };
	} catch (error) {
		console.error("Mass delete error:", error);
		return { success: false };
	}
}
