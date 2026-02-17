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
					method: options.method || "GET",
					timeout,
					timeoutMs: timeout,
					error: error.message,
					hasAbortSignal: !!options.signal,
				},
				`Operation "${operation}" timed out after ${timeout}ms - URL: ${url.toString()}`,
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
 * @param queueWaitTime - Optional queue wait time to subtract from timeout (so timeout only applies to actual request)
 * @returns Promise that resolves to the function result or rejects with a timeout error
 */
export async function withTimeout<T>(
	fn: () => Promise<T>,
	timeoutMs?: number,
	operationName?: string,
	queueWaitTime?: number,
): Promise<T> {
	const baseTimeout = timeoutMs ?? env.JOURNEYS_STRAPI_REQUEST_TIMEOUT_MS;
	const operation = operationName || "unknown operation";

	// Subtract queue wait time from timeout so timeout only applies to actual request execution
	// This prevents false timeouts when requests are waiting in queue
	// Use 10% of baseTimeout as minimum to accommodate Strapi's normal response times (1-8 seconds)
	// This ensures we don't timeout successful requests that take longer than 1 second
	const minTimeout = Math.max(10000, Math.floor(baseTimeout * 0.1)); // At least 10 seconds or 10% of baseTimeout
	const effectiveTimeout = queueWaitTime
		? Math.max(minTimeout, baseTimeout - queueWaitTime)
		: baseTimeout;

	const fnStartTime = Date.now();
	let fnCompleted = false;
	let timeoutFired = false;

	const fnPromise = fn().then(
		(result) => {
			fnCompleted = true;
			if (timeoutFired) {
				const actualDuration = Date.now() - fnStartTime;
				logger.warn(
					{
						operation,
						effectiveTimeout,
						baseTimeout,
						queueWaitTime,
						actualDuration,
					},
					`Operation "${operation}" completed after timeout fired (race condition) - actual duration: ${actualDuration}ms`,
				);
			}
			return result;
		},
		(error) => {
			fnCompleted = true;
			throw error;
		},
	);

	const timeoutPromise = new Promise<T>((_, reject) => {
		setTimeout(() => {
			timeoutFired = true;
			if (!fnCompleted) {
				const actualDuration = Date.now() - fnStartTime;
				const timeoutError = new Error(
					`Operation "${operation}" timed out after ${effectiveTimeout}ms (actual duration: ${actualDuration}ms)`,
				);
				timeoutError.name = "TimeoutError";
				logger.warn(
					{
						operation,
						effectiveTimeout,
						baseTimeout,
						queueWaitTime,
						actualDuration,
						note: queueWaitTime
							? `Timeout applied only to request execution (${effectiveTimeout}ms), queue wait was ${queueWaitTime}ms`
							: "Timeout includes full operation duration",
					},
					`Operation "${operation}" timed out after ${effectiveTimeout}ms (actual duration: ${actualDuration}ms)`,
				);
				reject(timeoutError);
			}
		}, effectiveTimeout);
	});

	return Promise.race([fnPromise, timeoutPromise]);
}
