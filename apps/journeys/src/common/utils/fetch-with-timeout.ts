import { logger } from "../../logger";
import { env } from "./env-config";

/**
 * Fetches a URL with a configurable timeout
 * Uses AbortController to cancel the request if it exceeds the timeout
 * @param url - The URL to fetch
 * @param options - Fetch options (timeout is extracted and handled separately)
 * @param timeoutMs - Timeout in milliseconds (defaults to JOURNEYS_STRAPI_REQUEST_TIMEOUT_MS)
 * @param operationName - Optional name/description of the operation for better logging (e.g., "applyRule", "fetchJourneyStep")
 * @returns Promise that resolves to the Response or rejects with a timeout error
 */
export async function fetchWithTimeout(
	url: string | URL,
	options: RequestInit = {},
	timeoutMs?: number,
	operationName?: string,
): Promise<Response> {
	const timeout = timeoutMs ?? env.JOURNEYS_STRAPI_REQUEST_TIMEOUT_MS;
	const operation = operationName || `fetch(${url.toString()})`;
	const controller = new AbortController();
	const timer = setTimeout(() => {
		controller.abort();
	}, timeout);

	try {
		const response = await fetch(url, {
			...options,
			signal: controller.signal,
		});
		clearTimeout(timer);
		return response;
	} catch (error: any) {
		clearTimeout(timer);

		// Check if error is due to timeout (abort)
		if (error.name === "AbortError" || controller.signal.aborted) {
			const timeoutError = new Error(
				`Operation "${operation}" timed out after ${timeout}ms: ${url}`,
			);
			timeoutError.name = "TimeoutError";
			logger.warn(
				{
					operation,
					url: url.toString(),
					timeout,
					timeoutMs: timeout,
					error: error.message,
				},
				`Operation "${operation}" timed out after ${timeout}ms: ${url}`,
			);
			throw timeoutError;
		}

		// Re-throw other errors
		throw error;
	}
}

/**
 * Wraps an async function with timeout protection
 * Useful for wrapping service calls that don't use fetch directly
 * @param fn - The async function to wrap
 * @param timeoutMs - Timeout in milliseconds (defaults to JOURNEYS_STRAPI_REQUEST_TIMEOUT_MS)
 * @param operationName - Optional name/description of the operation for better logging (e.g., "journeysService.findOne", "processJob")
 * @returns Promise that resolves to the function result or rejects with a timeout error
 */
export async function withTimeout<T>(
	fn: () => Promise<T>,
	timeoutMs?: number,
	operationName?: string,
): Promise<T> {
	const timeout = timeoutMs ?? env.JOURNEYS_STRAPI_REQUEST_TIMEOUT_MS;
	const operation = operationName || "unknown operation";

	return Promise.race([
		fn(),
		new Promise<T>((_, reject) => {
			setTimeout(() => {
				const timeoutError = new Error(
					`Operation "${operation}" timed out after ${timeout}ms`,
				);
				timeoutError.name = "TimeoutError";
				logger.warn(
					{
						operation,
						timeout,
						timeoutMs: timeout,
					},
					`Operation "${operation}" timed out after ${timeout}ms`,
				);
				reject(timeoutError);
			}, timeout);
		}),
	]);
}
