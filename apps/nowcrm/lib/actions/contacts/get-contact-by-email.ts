// contactsapp/lib/actions/contacts/getContactByEmail.ts

"use server";

import { contactsService } from "@nowcrm/services/server";
import { Contact } from "@nowcrm/services";
import { auth } from "@/auth";

export async function getContactByEmail(
	email: string,
): Promise<Contact | null> {
	if (!email || typeof email !== "string") {
		throw new Error("Invalid email provided");
	}

    const session = await auth();
    if (!session) {
        throw new Error("Unauthorized");
    }
	const normalizedEmail = email.trim().toLowerCase();

	const response = await contactsService.find(session.jwt, {
		populate: {
			subscriptions: { populate: ["id", "channel", "subscribedAt"] },
			contact_interests: "*",
		},
		filters: {
			email: { $eqi: normalizedEmail },
		},
	});

	if (Array.isArray(response.data) && response.data.length > 0) {
		return response.data[0];
	}

	return null;
}
