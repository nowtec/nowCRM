// massUnsubscribe.ts
"use server";

import { auth } from "@/auth";
import { DocumentId } from "@nowcrm/services";
import { contactsService, handleError, StandardResponse, subscriptionsService } from "@nowcrm/services/server";
	export async function massUnsubscribeContacts(
	contacts: DocumentId[],
): Promise<StandardResponse<null>> {
	console.log("[Server] massUnsubscribeContacts called with:", contacts);

	const session = await auth();
	if (!session) {
		console.warn("[Server] No session, returning 403");
		return {
			data: null,
			status: 403,
			success: false,
		};
	}

	try {
		const unsubscribePromises = contacts.map(async (contactId) => {
			console.log("[Server] Fetching contact", contactId);
			const contact = await contactsService.findOne(contactId, session.jwt, {
				populate: ["subscriptions"],
			});

			const subscriptionId = contact?.data?.subscriptions?.[0]?.documentId;

			if (!subscriptionId) {
				console.warn(`[Server] No subscription found for contact ${contactId}`);
				return {
					success: false,
					message: `No subscription found for contact ${contactId}`,
				};
			}

			console.log(
				`[Server] Updating subscription ${subscriptionId} (contact ${contactId}) -> active = false`,
			);

			const res = await subscriptionsService.update(subscriptionId, {
				active: false,
			}, session.jwt);

			console.log("[Server] Result for subscription", subscriptionId, ":", res);
			return res;
		});

		const results = await Promise.all(unsubscribePromises);

		const failed = results.filter((r) => !r.success);
		if (failed.length > 0) {
			console.warn("[Server] Some contacts failed to unsubscribe:", failed);
			return {
				data: null,
				status: 500,
				success: false,
				errorMessage: "Some contacts could not be unsubscribed",
			};
		}

		console.log("[Server] All contacts unsubscribed successfully");

		return {
			data: null,
			status: 200,
			success: true,
		};
	} catch (error: any) {
		return handleError(error);
	}
}
