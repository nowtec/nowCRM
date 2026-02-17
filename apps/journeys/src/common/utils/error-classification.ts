/**
 * Error classification types for better error handling and retry strategies
 */
export type ErrorType =
	| "timeout"
	| "slow_response"
	| "network_error"
	| "http_error"
	| "transaction_error"
	| "validation_error"
	| "authorization_error"
	| "unknown_error";

/**
 * Classified error information
 */
export interface ClassifiedError {
	type: ErrorType;
	error: Error;
	isRetryable: boolean;
	shouldUseBackoff: boolean;
	backoffMultiplier?: number; // Multiplier for backoff delay (default: 1)
	description: string;
}

/**
 * Classifies an error into a specific error type
 * @param error - The error to classify
 * @param responseTimeMs - Optional response time in milliseconds (for slow response detection)
 * @param timeoutMs - Optional timeout value in milliseconds (for slow response detection)
 * @returns Classified error information
 */
export function classifyError(
	error: Error,
	responseTimeMs?: number,
	timeoutMs?: number,
): ClassifiedError {
	const errorMessage = error.message || "";
	const errorName = error.constructor.name || "";
	const errorMessageLower = errorMessage.toLowerCase();
	const errorNameLower = errorName.toLowerCase();

	// 1. Timeout errors - request exceeded timeout
	if (
		errorName === "TimeoutError" ||
		errorMessageLower.includes("timeout") ||
		errorMessageLower.includes("request timeout") ||
		errorMessageLower.includes("operation timeout") ||
		errorMessageLower.includes("etimedout")
	) {
		return {
			type: "timeout",
			error,
			isRetryable: true,
			shouldUseBackoff: true,
			backoffMultiplier: 1.5, // Timeout errors get longer backoff
			description: "Request timed out before completion",
		};
	}

	// 2. Slow response - successful but took too long (if responseTimeMs provided)
	if (
		responseTimeMs !== undefined &&
		timeoutMs !== undefined &&
		responseTimeMs >= timeoutMs * 0.8 && // Within 80% of timeout
		!errorMessageLower.includes("error") &&
		!errorMessageLower.includes("failed")
	) {
		return {
			type: "slow_response",
			error,
			isRetryable: false, // Slow but successful responses shouldn't be retried
			shouldUseBackoff: false,
			description: `Response was slow (${responseTimeMs}ms) but successful`,
		};
	}

	// 3. Network errors - connection issues
	const networkErrorPatterns = [
		"econnreset",
		"epipe",
		"socket hang up",
		"fetch failed",
		"network error",
		"econnrefused",
		"enotfound",
		"eai_again",
	];
	if (
		networkErrorPatterns.some((pattern) =>
			errorMessageLower.includes(pattern),
		) ||
		networkErrorPatterns.some((pattern) => errorNameLower.includes(pattern))
	) {
		return {
			type: "network_error",
			error,
			isRetryable: true,
			shouldUseBackoff: true,
			backoffMultiplier: 1.2, // Network errors get moderate backoff
			description: "Network connection error",
		};
	}

	// 4. Transaction/Database errors
	const transactionErrorPatterns = [
		"current transaction is aborted",
		"transaction is aborted",
		"deadlock detected",
		"could not serialize access",
		"lock not available",
		"database",
		"postgres",
	];
	if (
		transactionErrorPatterns.some((pattern) =>
			errorMessageLower.includes(pattern),
		) ||
		errorMessageLower.includes("500") // 500 errors often indicate transaction errors
	) {
		return {
			type: "transaction_error",
			error,
			isRetryable: true,
			shouldUseBackoff: true,
			backoffMultiplier: 2.0, // Transaction errors need longer backoff
			description: "Database/transaction error",
		};
	}

	// 5. Authorization errors (401, 403)
	if (
		errorMessageLower.includes("401") ||
		errorMessageLower.includes("unauthorized") ||
		errorMessageLower.includes("403") ||
		errorMessageLower.includes("forbidden") ||
		errorName === "UnauthorizedError" ||
		errorName === "ForbiddenError"
	) {
		return {
			type: "authorization_error",
			error,
			isRetryable: false, // Auth errors shouldn't be retried
			shouldUseBackoff: false,
			description: "Authorization/authentication error",
		};
	}

	// 6. Validation errors (400, 422)
	if (
		errorMessageLower.includes("400") ||
		errorMessageLower.includes("422") ||
		errorMessageLower.includes("validation") ||
		errorMessageLower.includes("bad request") ||
		errorName === "ValidationError"
	) {
		return {
			type: "validation_error",
			error,
			isRetryable: false, // Validation errors shouldn't be retried
			shouldUseBackoff: false,
			description: "Validation error",
		};
	}

	// 7. HTTP errors (4xx, 5xx)
	if (
		errorMessageLower.includes("404") ||
		errorMessageLower.includes("not found") ||
		errorMessageLower.includes("500") ||
		errorMessageLower.includes("502") ||
		errorMessageLower.includes("503") ||
		errorMessageLower.includes("504") ||
		errorName === "NotFoundError"
	) {
		// 404 errors are not retryable
		if (
			errorMessageLower.includes("404") ||
			errorMessageLower.includes("not found") ||
			errorName === "NotFoundError"
		) {
			return {
				type: "http_error",
				error,
				isRetryable: false,
				shouldUseBackoff: false,
				description: "Resource not found (404)",
			};
		}

		// 5xx errors are retryable
		return {
			type: "http_error",
			error,
			isRetryable: true,
			shouldUseBackoff: true,
			backoffMultiplier: 1.5,
			description: "HTTP server error (5xx)",
		};
	}

	// 8. Unknown error - default classification
	return {
		type: "unknown_error",
		error,
		isRetryable: true, // Default to retryable for unknown errors
		shouldUseBackoff: true,
		backoffMultiplier: 1.0,
		description: "Unknown error type",
	};
}

/**
 * Checks if an error is retryable based on its classification
 */
export function isRetryableError(
	error: Error,
	responseTimeMs?: number,
	timeoutMs?: number,
): boolean {
	const classified = classifyError(error, responseTimeMs, timeoutMs);
	return classified.isRetryable;
}

/**
 * Gets the backoff multiplier for an error
 * Returns 1.0 if error doesn't need backoff
 */
export function getBackoffMultiplier(
	error: Error,
	responseTimeMs?: number,
	timeoutMs?: number,
): number {
	const classified = classifyError(error, responseTimeMs, timeoutMs);
	return classified.shouldUseBackoff
		? classified.backoffMultiplier ?? 1.0
		: 1.0;
}

/**
 * Gets a human-readable description of the error type
 */
export function getErrorDescription(
	error: Error,
	responseTimeMs?: number,
	timeoutMs?: number,
): string {
	const classified = classifyError(error, responseTimeMs, timeoutMs);
	return classified.description;
}
