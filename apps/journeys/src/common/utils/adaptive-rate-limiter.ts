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
	private responseTimes: number[] = []; // Total duration (including queue wait)
	private requestTimes: number[] = []; // Actual request duration (excluding queue wait)
	private consecutiveErrors = 0;
	private httpErrorsInRow = 0;
	private circuitBroken = false;
	private circuitRecoveryTime: number;
	private lastCircuitBreakTime: number = 0; // Track when circuit breaker was last triggered
	private cooldownPeriod: number = 60000; // 60 seconds cooldown after circuit breaker recovery
	private lastAdjustmentTime: number = 0; // Track when concurrency was last adjusted

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
	private readonly STABILITY_ZONE_MIN: number;
	private readonly STABILITY_ZONE_MAX: number;
	private readonly MIN_ADJUSTMENT_INTERVAL_MS: number;

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
		this.STABILITY_ZONE_MIN =
			env.JOURNEYS_RATE_LIMITER_STABILITY_ZONE_MIN ?? 300;
		this.STABILITY_ZONE_MAX =
			env.JOURNEYS_RATE_LIMITER_STABILITY_ZONE_MAX ?? 500;
		this.MIN_ADJUSTMENT_INTERVAL_MS =
			env.JOURNEYS_RATE_LIMITER_MIN_ADJUSTMENT_INTERVAL_MS ?? 10000;

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
		this.lastCircuitBreakTime = Date.now();

		logger.warn(
			{
				reason,
				recoveryTime: this.circuitRecoveryTime,
				currentConcurrency: this.concurrency,
				cooldownPeriod: this.cooldownPeriod,
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

		// Reduce concurrency, but be less aggressive if already at minimum
		// This prevents death spiral when we're already at MIN_CONCURRENCY
		if (this.concurrency <= this.MIN_CONCURRENCY) {
			// Already at minimum, don't reduce further
			logger.warn(
				{
					currentConcurrency: this.concurrency,
					minConcurrency: this.MIN_CONCURRENCY,
				},
				"Circuit breaker triggered but already at minimum concurrency - system may be overloaded",
			);
		} else {
			// Reduce concurrency significantly but not below minimum
			this.concurrency = Math.max(
				this.MIN_CONCURRENCY,
				Math.floor(this.concurrency * 0.7),
			);
			this.reinitLimiter();
		}

		// Reset tracking to start fresh after recovery
		this.responseTimes.length = 0;
		this.requestTimes.length = 0;
		this.consecutiveErrors = 0;
		this.httpErrorsInRow = 0;
		this.circuitBroken = false;
		this.lastAdjustmentTime = Date.now(); // Reset adjustment timer after circuit breaker

		logger.info(
			{
				newConcurrency: this.concurrency,
				recoveryTime: this.circuitRecoveryTime,
				cooldownPeriod: this.cooldownPeriod,
			},
			"Circuit breaker restored, resuming with reduced concurrency (cooldown active)",
		);
	}

	/**
	 * Adjust concurrency based on average response time
	 * Uses actual request time (excluding queue wait) for circuit breaker decisions
	 * to avoid false triggers when rate limiter queue is backed up
	 */
	private adjustConcurrency(): void {
		if (this.requestTimes.length === 0) return;

		// Use actual request time (excluding queue wait) for circuit breaker decisions
		// This prevents false triggers when the rate limiter queue is backed up
		const avgRequestTime =
			this.requestTimes.reduce((sum, t) => sum + t, 0) /
			this.requestTimes.length;

		// Use total time (including queue wait) for logging/debugging
		const avgTotalTime =
			this.responseTimes.length > 0
				? this.responseTimes.reduce((sum, t) => sum + t, 0) /
					this.responseTimes.length
				: avgRequestTime;

		// Check if we're in cooldown period after circuit breaker recovery
		const timeSinceLastCircuitBreak = Date.now() - this.lastCircuitBreakTime;
		const isInCooldown = timeSinceLastCircuitBreak < this.cooldownPeriod;

		// Circuit breaker threshold exceeded - use actual request time
		// But only trigger if not in cooldown period (prevents rapid re-triggering)
		if (avgRequestTime > this.CIRCUIT_BREAK_THRESHOLD && !isInCooldown) {
			void this.triggerCircuitBreaker(
				`avg request time ${avgRequestTime.toFixed(0)}ms (total: ${avgTotalTime.toFixed(0)}ms)`,
			);
			return;
		}

		// Don't adjust concurrency during cooldown period to allow system to stabilize
		if (isInCooldown) {
			return;
		}

		// Check minimum time between adjustments to prevent oscillation
		const timeSinceLastAdjustment = Date.now() - this.lastAdjustmentTime;
		if (timeSinceLastAdjustment < this.MIN_ADJUSTMENT_INTERVAL_MS) {
			return; // Too soon since last adjustment, wait for more stability
		}

		// Stability zone: if response times are in a good range, don't adjust
		// This prevents oscillation when system is performing well
		if (
			avgRequestTime >= this.STABILITY_ZONE_MIN &&
			avgRequestTime <= this.STABILITY_ZONE_MAX
		) {
			// In stability zone - don't adjust, system is performing well
			return;
		}

		// Require more data points before making adjustments (at least 70% of window)
		const minDataPoints = Math.ceil(this.RESPONSE_WINDOW * 0.7);
		if (this.requestTimes.length < minDataPoints) {
			return; // Not enough data yet
		}

		// Ramp up if request times are consistently good (use actual request time, not total)
		// Only increment by 1 to prevent aggressive increases
		if (
			avgRequestTime < this.RAMP_UP_THRESHOLD &&
			this.concurrency < this.MAX_CONCURRENCY
		) {
			this.concurrency = Math.min(this.concurrency + 1, this.MAX_CONCURRENCY);
			this.reinitLimiter();
			this.lastAdjustmentTime = Date.now();
			logger.info(
				{
					newConcurrency: this.concurrency,
					avgRequestTime: avgRequestTime.toFixed(0),
					avgTotalTime: avgTotalTime.toFixed(0),
					stabilityZone: `${this.STABILITY_ZONE_MIN}-${this.STABILITY_ZONE_MAX}ms`,
				},
				"Concurrency increased",
			);
		}
		// Ramp down if request times are consistently slow (use actual request time, not total)
		else if (
			avgRequestTime > this.RAMP_DOWN_THRESHOLD &&
			this.concurrency > this.MIN_CONCURRENCY
		) {
			this.concurrency--;
			this.reinitLimiter();
			this.lastAdjustmentTime = Date.now();
			logger.info(
				{
					newConcurrency: this.concurrency,
					avgRequestTime: avgRequestTime.toFixed(0),
					avgTotalTime: avgTotalTime.toFixed(0),
					stabilityZone: `${this.STABILITY_ZONE_MIN}-${this.STABILITY_ZONE_MAX}ms`,
				},
				"Concurrency decreased",
			);
		}
	}

	/**
	 * Record response time and adjust concurrency if needed
	 * @param totalDurationMs - Total duration including queue wait time
	 * @param requestDurationMs - Actual request duration excluding queue wait time
	 * @param isError - Whether the request resulted in an error
	 */
	private recordResponseTime(
		totalDurationMs: number,
		requestDurationMs: number,
		isError = false,
	): void {
		this.responseTimes.push(totalDurationMs);
		if (this.responseTimes.length > this.RESPONSE_WINDOW) {
			this.responseTimes.shift();
		}

		// Track actual request time separately for circuit breaker decisions
		this.requestTimes.push(requestDurationMs);
		if (this.requestTimes.length > this.RESPONSE_WINDOW) {
			this.requestTimes.shift();
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
		if (this.requestTimes.length >= Math.min(5, this.RESPONSE_WINDOW)) {
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
		let requestStartTime: number | null = null;
		const operation = operationName || "unknown operation";

		try {
			const result = await this.limit(async () => {
				const queueWaitTime = Date.now() - queueEntryTime;
				requestStartTime = Date.now();

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
					// Use longer timeout for findAll operations - they can legitimately take 60+ seconds
					// Note: .find() operations are NOT findAll - they use regular timeout
					const isFindAllOperation = operationName
						?.toLowerCase()
						.includes("findall");
					const timeoutMs = isFindAllOperation
						? env.JOURNEYS_STRAPI_FINDALL_TIMEOUT_MS
						: env.JOURNEYS_STRAPI_REQUEST_TIMEOUT_MS;

					return await withTimeout(fn, timeoutMs, operation, queueWaitTime);
				} catch (error: any) {
					_isError = true;
					const totalDuration = Date.now() - startTime;
					const requestDuration = Date.now() - requestStartTime;

					// Determine the correct timeout for error classification
					// Note: .find() operations are NOT findAll - they use regular timeout
					const isFindAllOperation = operationName
						?.toLowerCase()
						.includes("findall");
					const timeoutForClassification = isFindAllOperation
						? env.JOURNEYS_STRAPI_FINDALL_TIMEOUT_MS
						: env.JOURNEYS_STRAPI_REQUEST_TIMEOUT_MS;

					// Classify the error for better handling - use request duration for timeout classification
					const classified = classifyError(
						error,
						requestDuration,
						timeoutForClassification,
					);
					errorType = classified.type;

					// Log errors with classification
					if (classified.type === "timeout") {
						logger.warn(
							{
								operation,
								errorType: classified.type,
								timeout: timeoutForClassification,
								isFindAllOperation,
								totalDuration,
								queueWaitTime,
								requestDuration,
								error: error.message,
								description: classified.description,
								note:
									queueWaitTime > totalDuration * 0.5
										? "Timeout likely due to rate limiter queue delay (request may not have reached Strapi)"
										: isFindAllOperation
											? "findAll operation timed out - this may indicate a very large dataset or Strapi performance issue"
											: "Timeout occurred during actual request",
							},
							`Operation "${operation}" timed out after ${totalDuration}ms (queue: ${queueWaitTime}ms, request: ${requestDuration}ms, timeout: ${timeoutForClassification}ms)`,
						);
					} else if (classified.type === "slow_response") {
						logger.info(
							{
								errorType: classified.type,
								requestTime: requestDuration,
								totalTime: totalDuration,
								timeout: env.JOURNEYS_STRAPI_REQUEST_TIMEOUT_MS,
								description: classified.description,
							},
							"Slow response detected (but successful)",
						);
					} else {
						logger.warn(
							{
								errorType: classified.type,
								requestTime: requestDuration,
								totalTime: totalDuration,
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

			const totalDuration = Date.now() - startTime;
			const requestDuration = requestStartTime
				? Date.now() - requestStartTime
				: totalDuration;

			// Check if response was slow but successful (use request duration)
			if (requestDuration > this.RAMP_DOWN_THRESHOLD) {
				const classified = classifyError(
					new Error("Slow response"),
					requestDuration,
					env.JOURNEYS_STRAPI_REQUEST_TIMEOUT_MS,
				);
				if (classified.type === "slow_response") {
					logger.debug(
						{
							requestTime: requestDuration,
							totalTime: totalDuration,
							threshold: this.RAMP_DOWN_THRESHOLD,
						},
						"Slow but successful response",
					);
				}
			}

			this.recordResponseTime(totalDuration, requestDuration, false);
			this.onHttpSuccess();

			return result;
		} catch (error) {
			const totalDuration = Date.now() - startTime;
			// For errors that occur before the limit callback executes, requestStartTime may be null
			// In that case, use totalDuration as fallback (though ideally this shouldn't happen)
			const requestDuration = requestStartTime
				? Date.now() - requestStartTime
				: totalDuration;
			this.recordResponseTime(totalDuration, requestDuration, true);

			// Re-classify error if not already classified
			if (!errorType) {
				const classified = classifyError(
					error as Error,
					requestDuration,
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
