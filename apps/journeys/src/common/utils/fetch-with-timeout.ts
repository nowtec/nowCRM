import { logger } from "../../logger";
import { env } from "./env-config";

/**
 * Fetches a URL with a configurable timeout
 * Uses AbortController to cancel the request if it exceeds the timeout
 * @param url - The URL to fetch
 * @param options - Fetch options (timeout is extracted and handled separately)
 * @param timeoutMs - Timeout in milliseconds (defaults to JOURNEYS_STRAPI_REQUEST_TIMEOUT_MS)
 * @returns Promise that resolves to the Response or rejects with a timeout error
 */
export async function fetchWithTimeout(
	url: string | URL,
	options: RequestInit = {},
	timeoutMs?: number,
): Promise<Response> {
	const timeout = timeoutMs ?? env.JOURNEYS_STRAPI_REQUEST_TIMEOUT_MS;
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
				`Request timeout after ${timeout}ms: ${url}`,
			);
			timeoutError.name = "TimeoutError";
			logger.warn(
				{
					url: url.toString(),
					timeout,
					error: error.message,
				},
				"Request timed out",
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
 * @returns Promise that resolves to the function result or rejects with a timeout error
 */
export async function withTimeout<T>(
	fn: () => Promise<T>,
	timeoutMs?: number,
): Promise<T> {
	const timeout = timeoutMs ?? env.JOURNEYS_STRAPI_REQUEST_TIMEOUT_MS;

	return Promise.race([
		fn(),
		new Promise<T>((_, reject) => {
			setTimeout(() => {
				const timeoutError = new Error(`Operation timeout after ${timeout}ms`);
				timeoutError.name = "TimeoutError";
				logger.warn(
					{
						timeout,
					},
					"Operation timed out",
				);
				reject(timeoutError);
			}, timeout);
		}),
	]);
}
