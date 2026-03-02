import type { DocumentId, JourneyStepRule } from "@nowcrm/services";
import { adaptiveRateLimiter } from "@/common/utils/adaptive-rate-limiter";
import { AUTH_HEADER, env } from "@/common/utils/env-config";
import { fetchWithTimeout } from "@/common/utils/fetch-with-timeout";

export async function applyRule(
	rule: JourneyStepRule,
	contactId: DocumentId,
): Promise<boolean> {
	const base = env.STRAPI_URL;
	let readyCondition = rule.ready_condition;

	// Handle DAYS_AGO format for dynamic date calculation
	// Replace DAYS_AGO:X with actual date (now - X days)
	const daysAgoMatch = readyCondition.match(/DAYS_AGO:(\d+)/);
	if (daysAgoMatch) {
		const days = parseInt(daysAgoMatch[1], 10);
		const targetDate = new Date();
		targetDate.setDate(targetDate.getDate() - days);
		const isoDate = targetDate.toISOString();
		readyCondition = readyCondition.replace(
			/DAYS_AGO:\d+/,
			encodeURIComponent(isoDate),
		);
	}

	let url: URL;
	if (readyCondition.startsWith("/api")) {
		url = new URL(readyCondition.replace("CONTACT_ID", contactId), base);
	} else {
		url = new URL(
			`/api/contacts/?${readyCondition}&[filters][documentId]=${contactId}`,
			base,
		);
	}
	const response = await adaptiveRateLimiter.execute(
		() =>
			fetchWithTimeout(url, { headers: AUTH_HEADER }, undefined, "applyRule"),
		"applyRule",
	);
	if (!response.ok) {
		throw new Error(`Failed to apply rule: ${response.statusText}`);
	}
	const { data } = await response.json();
	return data.length > 0;
}
