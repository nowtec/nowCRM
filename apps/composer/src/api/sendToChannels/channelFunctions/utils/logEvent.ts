import type { Contact, DocumentId, Form_Event } from "@nowcrm/services";
import { eventsService } from "@nowcrm/services/server";
import { env } from "@/common/utils/envConfig";

export async function logEvent(
	contact: Contact,
	composition_id: DocumentId,
	channel_id: DocumentId,
	source: string,
	payload?: any,
): Promise<void> {
	const data = {
		contact: contact.documentId,
		composition_item: composition_id,
		external_id: "",
		destination: contact.email ?? contact.mobile_phone ?? contact.phone,
		status: "published",
		action: "publish",
		payload: payload ? JSON.stringify(payload) : "",
		source: source,
		channel: channel_id,
		publishedAt: new Date(),
	};
	await eventsService.create(
		data as Partial<Form_Event>,
		env.COMPOSER_STRAPI_API_TOKEN,
	);
}

export async function logUnpublishedEvent(
	contact: Contact,
	composition_id: DocumentId,
	channel_id: DocumentId,
	source: string,
	payload?: any,
): Promise<void> {
	const data = {
		contact: contact.documentId,
		composition_item: composition_id,
		external_id: "",
		destination: contact.email ?? contact.mobile_phone ?? contact.phone,
		status: "unpublished",
		action: "unpublish",
		payload: payload ? JSON.stringify(payload) : "",
		source: source,
		channel: channel_id,
		publishedAt: new Date(),
	};
	await eventsService.create(
		data as Partial<Form_Event>,
		env.COMPOSER_STRAPI_API_TOKEN,
	);
}
