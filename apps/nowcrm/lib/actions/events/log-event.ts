// lib/actions/events/logUnsubscribeEvent.ts
"use server";

import { auth } from "@/auth";
import { Contact, DocumentId, Event, Form_Event } from "@nowcrm/services";
import { eventsService, handleError, StandardResponse } from "@nowcrm/services/server";

export async function logUnsubscribeEvent(
	contact: Contact,
	channelId: DocumentId,
	compositionId?: DocumentId,
	payload?: any,
): Promise<StandardResponse<Event>> {
	const session = await auth();
	if (!session) {
		return {
			success: false,
			status: 403,
			data: null,
			errorMessage: "Unauthorized",
		};
	}

	try {
		const data: Partial<Form_Event> = {
			contact: contact.documentId,
			composition_item: compositionId,
			external_id: "",
			destination: contact.mobile_phone || contact.phone || "",
			event_status: 'unsubscribed',
			action: "unsubscribe",
			source: "Unsubscribe",
			channel: channelId,
			payload: payload ? JSON.stringify(payload) : "",
			publishedAt: new Date(),
			title: "Unsubscribe event",
		};

		return await eventsService.create(data as Form_Event,session.jwt);
	} catch (e) {
		return handleError(e);
	}
}
