"use server";
import { auth } from "@/auth";
import { DocumentId } from "@nowcrm/services";
import { subscriptionsService } from "@nowcrm/services/server";

export async function getSubscription(
	contactId: DocumentId,
	channelId: DocumentId,
): Promise<boolean> {
	const session = await auth();
	if (!session) return false;

	try {
		const existing = await subscriptionsService.find(session.jwt,{
			filters: {
				contact: {
					documentId: { $eq: contactId },
				},
				channel: {
					documentId: { $eq: channelId },
				},
			},
			pagination: { limit: 1 },
		});
		return Array.isArray(existing.data) && existing.data.length > 0;
	} catch (error) {
		console.error("Error getting subscription:", error);
		return false;
	}
}
