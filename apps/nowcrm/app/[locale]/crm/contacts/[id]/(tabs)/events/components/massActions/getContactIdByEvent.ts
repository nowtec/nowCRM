import { DocumentId } from "@nowcrm/services";

export function getContactIdByEventId(
	eventId: DocumentId,
	events: any[],
): DocumentId | null {
	const event = events.find((e) => e.documentId === eventId);
	return event?.contact?.documentId ?? null;
}
