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

	// Handle document type filtering from additional_data
	const additionalData =
		typeof rule.additional_data === "string"
			? JSON.parse(rule.additional_data)
			: rule.additional_data || {};
	const documentType = additionalData.documentType;

	// If document type is specified and condition involves contact_documents,
	// ensure the filter is included in readyCondition
	if (documentType && rule.condition === "[contact_documents]") {
		// Check if document type filter is already in readyCondition
		if (!readyCondition.includes("[type]")) {
			// Count existing $and conditions to determine index
			const andMatches = readyCondition.match(/\[$and\]/g);
			const nextIndex = andMatches ? andMatches.length : 0;

			// Add document type filter
			const separator = readyCondition.includes("?") ? "&" : "?";
			readyCondition += `${separator}filters[$and][${nextIndex}][contact_documents][type][$eqi]=${encodeURIComponent(documentType)}`;
		}
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
