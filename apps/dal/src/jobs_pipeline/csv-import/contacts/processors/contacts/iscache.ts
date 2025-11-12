import type { DocumentId } from "@nowcrm/services";
import { relationCache } from "../helpers/cache";

export function isContactInCache(contact: any): boolean {
	const contactsCache = relationCache.contacts;
	if (!contactsCache) return false;

	const identifiers = [
		contact.email,
		contact.linkedin_url,
		contact.mobile_phone,
		contact.phone,
	]
		.filter(Boolean)
		.map((v: string) => v.trim().toLowerCase());

	if (identifiers.length === 0) return false;

	for (const cachedKey of contactsCache.keys()) {
		const normalizedCachedKey = cachedKey.trim().toLowerCase();
		if (identifiers.includes(normalizedCachedKey)) {
			return true;
		}
	}

	return false;
}

export function getCachedContactId(contact: any): {
	id: number | null;
	documentId: DocumentId | null;
} {
	const contactsCache = relationCache.contacts;
	if (!contactsCache) return { id: null, documentId: null };

	const identifiers = [
		contact.email,
		contact.linkedin_url,
		contact.mobile_phone,
		contact.phone,
	]
		.filter(Boolean)
		.map((v: string) => v.trim().toLowerCase());

	if (identifiers.length === 0) return { id: null, documentId: null };

	for (const [cachedKey, cached] of contactsCache.entries()) {
		const normalizedCachedKey = cachedKey.trim().toLowerCase();
		if (identifiers.includes(normalizedCachedKey)) {
			return {
				id: cached?.id ?? null,
				documentId: cached?.documentId ?? null,
			};
		}
	}

	return { id: null, documentId: null };
}
