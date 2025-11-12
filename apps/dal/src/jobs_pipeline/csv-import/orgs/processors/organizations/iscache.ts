import type { DocumentId } from "@nowcrm/services";
import { relationCache } from "../../../contacts/processors/helpers/cache";

export function isOrganizationInCache(organization: any): boolean {
	const organizationsCache = relationCache.organizations;
	if (!organizationsCache || !organization.name) return false;

	const name =
		typeof organization.name === "string"
			? organization.name.trim().toLowerCase()
			: "";
	if (!name) return false;

	for (const cachedKey of organizationsCache.keys()) {
		if (cachedKey.trim().toLowerCase() === name) {
			return true;
		}
	}

	return false;
}

export function getCachedOrganizationId(organization: any): {
	id: number | null;
	documentId: DocumentId | null;
} {
	const organizationsCache = relationCache.organizations;
	if (!organizationsCache) return { id: null, documentId: null };

	const name =
		typeof organization.name === "string"
			? organization.name.trim().toLowerCase()
			: "";
	if (!name) return { id: null, documentId: null };

	for (const [cachedKey, cached] of organizationsCache.entries()) {
		if (cachedKey.trim().toLowerCase() === name) {
			return {
				id: cached?.id ?? null,
				documentId: cached?.documentId ?? null,
			};
		}
	}

	return { id: null, documentId: null };
}
