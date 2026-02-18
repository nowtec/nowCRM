import { env } from "@/common/utils/env-config";

/**
 * Builds a service URL for logging purposes
 * Matches the logic used in base.service.ts
 */
export function buildServiceUrl(
	endpoint: string,
	id?: string,
	queryParams?: Record<string, any>,
): string {
	const baseUrl = env.API_GATEWAY || "http://localhost:8080";
	const path = id ? `strapi/api/${endpoint}/${id}` : `strapi/api/${endpoint}`;
	const url = new URL(path, baseUrl);

	if (queryParams) {
		// Simple query string building for logging (not exact match but close enough)
		const params = new URLSearchParams();
		for (const [key, value] of Object.entries(queryParams)) {
			if (value !== undefined && value !== null) {
				params.append(key, String(value));
			}
		}
		const queryString = params.toString();
		if (queryString) {
			url.search = queryString;
		}
	}

	return url.toString();
}

/**
 * Builds URL for journeysService.findOne
 */
export function buildJourneyUrl(journeyId: string): string {
	return buildServiceUrl("journeys", journeyId);
}

/**
 * Builds URL for journeyStepsService.findOne
 */
export function buildJourneyStepUrl(stepId: string): string {
	return buildServiceUrl("journey-steps", stepId);
}

/**
 * Builds URL for contactsService.findOne
 */
export function buildContactUrl(contactId: string): string {
	return buildServiceUrl("contacts", contactId);
}

/**
 * Builds URL for journeyPassedStepService.find
 */
export function buildJourneyPassedStepFindUrl(
	filters?: Record<string, any>,
): string {
	return buildServiceUrl("journey-passed-steps", undefined, filters);
}
