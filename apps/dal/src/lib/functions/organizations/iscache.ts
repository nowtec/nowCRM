// functions/helpers/isOrganizationInCache.ts
import { relationCache } from "../helpers/cache";

export function isOrganizationInCache(organization: any): boolean {
	const organizationsCache = relationCache.organizations;
	if (!organizationsCache || !organization.name) return false;

	const name =
		typeof organization.name === "string"
			? organization.name.trim().toLowerCase()
			: "";
	if (!name) return false;

	for (const cachedEmail of organizationsCache.keys()) {
		if (cachedEmail.toLowerCase() === name) {
			return true;
		}
	}

	return false;
}
