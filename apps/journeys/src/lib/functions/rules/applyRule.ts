import type { DocumentId, JourneyStepRule } from "@nowcrm/services";
import { AUTH_HEADER, env } from "@/common/utils/env-config";

export async function applyRule(
	rule: JourneyStepRule,
	contactId: DocumentId,
): Promise<boolean> {
	const base = env.STRAPI_URL;
	const url = new URL(
		`/api/contacts/?${rule.ready_condition}&[filters][documentId]=${contactId}`,
		base,
	);

	const response = await fetch(url, { headers: AUTH_HEADER });
	if (!response.ok) {
		throw new Error(`Failed to apply rule: ${response.statusText}`);
	}
	const { data } = await response.json();
	return data.length > 0;
}
