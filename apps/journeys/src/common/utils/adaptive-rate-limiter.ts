import pLimit from "p-limit";
import { logger } from "../../logger";
import { env } from "./env-config";
import { classifyError, type ErrorType } from "./error-classification";
import { withTimeout } from "./fetch-with-timeout";

/**
 * Adaptive rate limiter that adjusts concurrency based on Strapi response times
 * Similar to DAL service implementation
 */
class AdaptiveRateLimiter {
	private concurrency: number;
	private limit: ReturnType<typeof pLimit>;
	private responseTimes: number[] = [];
	private consecutiveErrors = 0;
	private httpErrorsInRow = 0;
	private circuitBroken = false;
	private circuitRecoveryTime: number;

	// Configuration constants
	private readonly MIN_CONCURRENCY: number;
	private readonly MAX_CONCURRENCY: number;
	private readonly INITIAL_CONCURRENCY: number;
	private readonly RESPONSE_WINDOW: number;
	private readonly RAMP_UP_THRESHOLD: number;
	private readonly RAMP_DOWN_THRESHOLD: number;
	private readonly CIRCUIT_BREAK_THRESHOLD: number;
	private readonly MAX_CONSECUTIVE_ERRORS: number;
	private readonly MAX_CIRCUIT_RECOVERY: number;

	constructor() {
		// Load configuration from environment or use defaults
		this.MIN_CONCURRENCY = env.JOURNEYS_RATE_LIMITER_MIN_CONCURRENCY ?? 5;
		this.MAX_CONCURRENCY = env.JOURNEYS_RATE_LIMITER_MAX_CONCURRENCY ?? 30;
		this.INITIAL_CONCURRENCY =
			env.JOURNEYS_RATE_LIMITER_INITIAL_CONCURRENCY ?? 10;
		this.RESPONSE_WINDOW = env.JOURNEYS_RATE_LIMITER_RESPONSE_WINDOW ?? 30;
		this.RAMP_UP_THRESHOLD = env.JOURNEYS_RATE_LIMITER_RAMP_UP_THRESHOLD ?? 300;
		this.RAMP_DOWN_THRESHOLD =
			env.JOURNEYS_RATE_LIMITER_RAMP_DOWN_THRESHOLD ?? 800;
		this.CIRCUIT_BREAK_THRESHOLD =
			env.JOURNEYS_RATE_LIMITER_CIRCUIT_BREAK_THRESHOLD ?? 2000;
		this.MAX_CONSECUTIVE_ERRORS =
			env.JOURNEYS_RATE_LIMITER_MAX_CONSECUTIVE_ERRORS ?? 10;
		this.MAX_CIRCUIT_RECOVERY =
			env.JOURNEYS_RATE_LIMITER_MAX_CIRCUIT_RECOVERY ?? 30000;

		this.concurrency = this.INITIAL_CONCURRENCY;
		this.limit = pLimit(this.concurrency);
		this.circuitRecoveryTime = 3000;

		logger.info(
			{
				minConcurrency: this.MIN_CONCURRENCY,
				maxConcurrency: this.MAX_CONCURRENCY,
				initialConcurrency: this.INITIAL_CONCURRENCY,
				rampUpThreshold: this.RAMP_UP_THRESHOLD,
				rampDownThreshold: this.RAMP_DOWN_THRESHOLD,
				circuitBreakThreshold: this.CIRCUIT_BREAK_THRESHOLD,
			},
			"Adaptive rate limiter initialized",
		);
	}

	/**
	 * Reinitialize the limiter with new concurrency
	 */
	private reinitLimiter(): void {
		this.limit = pLimit(this.concurrency);
	}

	/**
	 * Trigger circuit breaker when Strapi is overwhelmed
	 */
	private async triggerCircuitBreaker(reason: string): Promise<void> {
		if (this.circuitBroken) return;

		this.circuitBroken = true;
		logger.warn(
			{
				reason,
				recoveryTime: this.circuitRecoveryTime,
				currentConcurrency: this.concurrency,
			},
			"Circuit breaker triggered, pausing requests",
		);

		await new Promise((resolve) =>
			setTimeout(resolve, this.circuitRecoveryTime),
		);

		// Increase recovery time for next time (exponential backoff)
		this.circuitRecoveryTime = Math.min(
			this.circuitRecoveryTime * 1.5,
			this.MAX_CIRCUIT_RECOVERY,
		);

		// Reduce concurrency significantly
		this.concurrency = Math.max(
			this.MIN_CONCURRENCY,
			Math.floor(this.concurrency * 0.7),
		);
		this.reinitLimiter();

		// Reset tracking
		this.responseTimes.length = 0;
		this.consecutiveErrors = 0;
		this.httpErrorsInRow = 0;
		this.circuitBroken = false;

		logger.info(
			{
				newConcurrency: this.concurrency,
				recoveryTime: this.circuitRecoveryTime,
			},
			"Circuit breaker restored, resuming with reduced concurrency",
		);
	}

	/**
	 * Adjust concurrency based on average response time
	 */
	private adjustConcurrency(): void {
		if (this.responseTimes.length === 0) return;

		const avg =
			this.responseTimes.reduce((sum, t) => sum + t, 0) /
			this.responseTimes.length;

		// Circuit breaker threshold exceeded
		if (avg > this.CIRCUIT_BREAK_THRESHOLD) {
			void this.triggerCircuitBreaker(`avg response ${avg.toFixed(0)}ms`);
			return;
		}

		// Ramp up if response times are good
		if (
			avg < this.RAMP_UP_THRESHOLD &&
			this.concurrency < this.MAX_CONCURRENCY
		) {
			const increment = avg < this.RAMP_UP_THRESHOLD / 2 ? 2 : 1;
			this.concurrency = Math.min(
				this.concurrency + increment,
				this.MAX_CONCURRENCY,
			);
			this.reinitLimiter();
			logger.info(
				{
					newConcurrency: this.concurrency,
					avgResponseTime: avg.toFixed(0),
				},
				"Concurrency increased",
			);
		}
		// Ramp down if response times are slow
		else if (
			avg > this.RAMP_DOWN_THRESHOLD &&
			this.concurrency > this.MIN_CONCURRENCY
		) {
			this.concurrency--;
			this.reinitLimiter();
			logger.info(
				{
					newConcurrency: this.concurrency,
					avgResponseTime: avg.toFixed(0),
				},
				"Concurrency decreased",
			);
		}
	}

	/**
	 * Record response time and adjust concurrency if needed
	 */
	private recordResponseTime(durationMs: number, isError = false): void {
		this.responseTimes.push(durationMs);
		if (this.responseTimes.length > this.RESPONSE_WINDOW) {
			this.responseTimes.shift();
		}

		if (isError) {
			this.consecutiveErrors++;
			if (this.consecutiveErrors >= this.MAX_CONSECUTIVE_ERRORS) {
				void this.triggerCircuitBreaker("too many consecutive errors");
			}
		} else {
			// Gradually reduce error count on success
			this.consecutiveErrors = Math.max(0, this.consecutiveErrors - 0.5);
		}

		// Adjust concurrency when we have enough data points
		if (this.responseTimes.length >= Math.min(5, this.RESPONSE_WINDOW)) {
			this.adjustConcurrency();
		}
	}

	/**
	 * Handle HTTP errors
	 */
	private onHttpError(): void {
		this.httpErrorsInRow++;
		if (this.httpErrorsInRow >= 5) {
			void this.triggerCircuitBreaker("too many HTTP errors in a row");
		}
	}

	/**
	 * Handle HTTP success
	 */
	private onHttpSuccess(): void {
		this.httpErrorsInRow = Math.max(0, this.httpErrorsInRow - 1);
	}

	/**
	 * Execute a function with rate limiting, timeout protection, and response time tracking
	 * @param fn - The async function to execute
	 * @param operationName - Optional name/description of the operation for better logging (e.g., "journeysService.findOne", "processJob")
	 */
	async execute<T>(fn: () => Promise<T>, operationName?: string): Promise<T> {
		const startTime = Date.now();
		const queueEntryTime = Date.now();
		let _isError = false;
		let errorType: ErrorType | null = null;
		const operation = operationName || "unknown operation";

		try {
			const result = await this.limit(async () => {
				const queueWaitTime = Date.now() - queueEntryTime;
				const requestStartTime = Date.now();

				// Log if queue wait time is significant (helps debug timeouts)
				if (queueWaitTime > 1000) {
					logger.debug(
						{
							operation,
							queueWaitTime,
							concurrency: this.concurrency,
						},
						`Operation "${operation}" waited ${queueWaitTime}ms in rate limiter queue`,
					);
				}

				try {
					// Wrap function with timeout protection
					// Pass queueWaitTime so timeout only applies to actual request execution, not queue wait
					return await withTimeout(
						fn,
						env.JOURNEYS_STRAPI_REQUEST_TIMEOUT_MS,
						operation,
						queueWaitTime,
					);
				} catch (error: any) {
					_isError = true;
					const duration = Date.now() - startTime;
					const requestDuration = Date.now() - requestStartTime;

					// Classify the error for better handling
					const classified = classifyError(
						error,
						duration,
						env.JOURNEYS_STRAPI_REQUEST_TIMEOUT_MS,
					);
					errorType = classified.type;

					// Log errors with classification
					if (classified.type === "timeout") {
						logger.warn(
							{
								operation,
								errorType: classified.type,
								timeout: env.JOURNEYS_STRAPI_REQUEST_TIMEOUT_MS,
								totalDuration: duration,
								queueWaitTime,
								requestDuration,
								error: error.message,
								description: classified.description,
								note:
									queueWaitTime > duration * 0.5
										? "Timeout likely due to rate limiter queue delay (request may not have reached Strapi)"
										: "Timeout occurred during actual request",
							},
							`Operation "${operation}" timed out after ${duration}ms (queue: ${queueWaitTime}ms, request: ${requestDuration}ms)`,
						);
					} else if (classified.type === "slow_response") {
						logger.info(
							{
								errorType: classified.type,
								responseTime: duration,
								timeout: env.JOURNEYS_STRAPI_REQUEST_TIMEOUT_MS,
								description: classified.description,
							},
							"Slow response detected (but successful)",
						);
					} else {
						logger.warn(
							{
								errorType: classified.type,
								responseTime: duration,
								error: error.message,
								description: classified.description,
								isRetryable: classified.isRetryable,
							},
							`Error occurred: ${classified.description}`,
						);
					}

					// Track HTTP/network/timeout errors for circuit breaker
					if (
						classified.type === "timeout" ||
						classified.type === "network_error" ||
						classified.type === "http_error"
					) {
						this.onHttpError();
					}

					throw error;
				}
			});

			const duration = Date.now() - startTime;

			// Check if response was slow but successful
			if (duration > this.RAMP_DOWN_THRESHOLD) {
				const classified = classifyError(
					new Error("Slow response"),
					duration,
					env.JOURNEYS_STRAPI_REQUEST_TIMEOUT_MS,
				);
				if (classified.type === "slow_response") {
					logger.debug(
						{
							responseTime: duration,
							threshold: this.RAMP_DOWN_THRESHOLD,
						},
						"Slow but successful response",
					);
				}
			}

			this.recordResponseTime(duration, false);
			this.onHttpSuccess();

			return result;
		} catch (error) {
			const duration = Date.now() - startTime;
			this.recordResponseTime(duration, true);

			// Re-classify error if not already classified
			if (!errorType) {
				const classified = classifyError(
					error as Error,
					duration,
					env.JOURNEYS_STRAPI_REQUEST_TIMEOUT_MS,
				);
				errorType = classified.type;
			}

			// Attach error type to error for downstream handling
			if (error instanceof Error) {
				(error as any).errorType = errorType;
			}

			throw error;
		}
	}

	/**
	 * Get current concurrency level
	 */
	getConcurrency(): number {
		return this.concurrency;
	}

	/**
	 * Get average response time
	 */
	getAverageResponseTime(): number {
		if (this.responseTimes.length === 0) return 0;
		return (
			this.responseTimes.reduce((sum, t) => sum + t, 0) /
			this.responseTimes.length
		);
	}
}

// Singleton instance
export const adaptiveRateLimiter = new AdaptiveRateLimiter();
