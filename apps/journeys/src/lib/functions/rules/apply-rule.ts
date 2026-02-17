import type { DocumentId, JourneyStepRule } from "@nowcrm/services";
import { adaptiveRateLimiter } from "@/common/utils/adaptive-rate-limiter";
import { AUTH_HEADER, env } from "@/common/utils/env-config";
import { fetchWithTimeout } from "@/common/utils/fetch-with-timeout";

export async function applyRule(
	rule: JourneyStepRule,
	contactId: DocumentId,
): Promise<boolean> {
	const base = env.STRAPI_URL;
	let url: URL;
	if (rule.ready_condition.startsWith("/api")) {
		url = new URL(rule.ready_condition.replace("CONTACT_ID", contactId), base);
	} else {
		url = new URL(
			`/api/contacts/?${rule.ready_condition}&[filters][documentId]=${contactId}`,
			base,
		);
	}
	const response = await adaptiveRateLimiter.execute(
		() => fetchWithTimeout(url, { headers: AUTH_HEADER }, undefined, "applyRule"),
		"applyRule",
	);
	if (!response.ok) {
		throw new Error(`Failed to apply rule: ${response.statusText}`);
	}
	const { data } = await response.json();
	return data.length > 0;
}
