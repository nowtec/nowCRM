import type { DocumentId } from "@nowcrm/services";
import { journeysService } from "@nowcrm/services/server";
import { adaptiveRateLimiter } from "@/common/utils/adaptive-rate-limiter";
import { env } from "@/common/utils/env-config";
import { logger } from "../../../logger";
import { buildJourneyUrl } from "./build-service-url";

export type JourneyStatus = "active" | "paused" | "deleted" | "unknown";

/**
 * Checks if a response indicates a deleted resource (404)
 * Checks both response.status and error structure from Strapi
 */
function isNotFoundError(
	response: { success: boolean; status: number; errorMessage?: string },
): boolean {
	// Check HTTP status code
	if (response.status === 404) {
		return true;
	}
	
	// Check error message for Strapi's NotFoundError pattern
	const errorMessage = response.errorMessage?.toLowerCase() || "";
	if (
		errorMessage.includes("404") ||
		errorMessage.includes("not found") ||
		errorMessage.includes("notfounderror")
	) {
		return true;
	}
	
	return false;
}

/**
 * Checks the status of a journey (active, paused, deleted, or unknown)
 * @param journeyId - The journey ID to check
 * @returns The journey status
 */
export async function checkJourneyStatus(
	journeyId: DocumentId,
): Promise<JourneyStatus> {
	try {
		const url = buildJourneyUrl(journeyId);
		const response = await adaptiveRateLimiter.execute(
			() => journeysService.findOne(journeyId, env.JOURNEYS_STRAPI_API_TOKEN),
			`journeysService.findOne (checkJourneyStatus) - ${url}`,
		);
		// Check if journey was deleted (404)
		if (!response.success && isNotFoundError(response)) {
			logger.info(
				{
					journeyId,
					status: response.status,
					errorMessage: response.errorMessage,
				},
				"Journey not found (deleted)",
			);
			return "deleted";
		}
		
		if (!response.success) {
			logger.warn(
				{
					journeyId,
					status: response.status,
					errorMessage: response.errorMessage,
				},
				"Failed to check journey status, assuming unknown to avoid blocking legitimate processing",
			);
			return "unknown";
		}
		
		if (!response.data) {
			logger.warn(
				{ journeyId },
				"Journey response has no data, assuming unknown",
			);
			return "unknown";
		}
		
		const isActive = response.data.active === true;
		
		if (!isActive) {
			logger.debug(
				{ journeyId },
				"Journey is paused/inactive",
			);
			return "paused";
		}
		
		return "active";
	} catch (error: any) {
		// Check if error indicates 404/deleted
		const errorMessage = error?.message?.toLowerCase() || "";
		const errorStatus = error?.status;
		
		if (
			errorStatus === 404 ||
			errorMessage.includes("404") ||
			errorMessage.includes("not found") ||
			errorMessage.includes("notfounderror")
		) {
			logger.info(
				{ err: error, journeyId, errorStatus },
				"Journey not found (deleted) - error indicates 404",
			);
			return "deleted";
		}
		
		logger.error(
			{ err: error, journeyId },
			"Failed to check journey status, assuming unknown to avoid blocking legitimate processing",
		);
		return "unknown";
	}
}

/**
 * Checks if a journey is currently active
 * Used to prevent processing jobs, rules, etc. for paused journeys
 * @param journeyId - The journey ID to check
 * @returns true if journey is active, false if paused/inactive
 */
export async function isJourneyActive(journeyId: DocumentId): Promise<boolean> {
	const status = await checkJourneyStatus(journeyId);
	return status === "active";
}
