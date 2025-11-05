// functions/helpers/isContactInCache.ts
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

export function getCachedContactId(contact: any): number | null {
	const contactsCache = relationCache.contacts;
	if (!contactsCache) return null;

	const identifiers = [
		contact.email,
		contact.linkedin_url,
		contact.mobile_phone,
		contact.phone,
	]
		.filter(Boolean)
		.map((v: string) => v.trim().toLowerCase());

	if (identifiers.length === 0) return null;

	for (const [cachedKey, cachedId] of contactsCache.entries()) {
		const normalizedCachedKey = cachedKey.trim().toLowerCase();
		if (identifiers.includes(normalizedCachedKey)) {
			return cachedId;
		}
	}

	return null;
}
