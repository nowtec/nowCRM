// actions/deleteContactAction.ts
"use server";
import { auth } from "@/auth";
import { DocumentId, Subscription } from "@nowcrm/services";
import { handleError, StandardResponse, subscriptionsService } from "@nowcrm/services/server";

export async function createSubscription(
	channel: DocumentId,
	contact: DocumentId,
): Promise<StandardResponse<Subscription>> {
	const session = await auth();
	if (!session) {
		return {
			data: null,
			status: 403,
			success: false,
		};
	}
	try {
		const res = await subscriptionsService.create({
			channel: channel,
			contact: contact,
			active: false,
			subscribed_at: new Date(),
			publishedAt: new Date(),
		},session.jwt);
		return res;
	} catch (error) {
		return handleError(error);
	}
}
