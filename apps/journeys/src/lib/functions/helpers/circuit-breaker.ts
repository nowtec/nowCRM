import { env } from "@/common/utils/env-config";
import { logger } from "@/logger";

type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

interface CircuitBreakerOptions {
	failureThreshold: number;
	resetTimeout: number;
	halfOpenMaxCalls: number;
	name: string;
}

interface CircuitBreakerStats {
	state: CircuitState;
	failures: number;
	successes: number;
	lastFailureTime: number | null;
	halfOpenCalls: number;
}

/**
 * Circuit Breaker implementation to prevent cascading failures
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Service is failing, requests are rejected immediately
 * - HALF_OPEN: Testing if service recovered, limited requests allowed
 */
export class CircuitBreaker {
	private stats: CircuitBreakerStats;
	private options: CircuitBreakerOptions;

	constructor(options: CircuitBreakerOptions) {
		this.options = options;
		this.stats = {
			state: "CLOSED",
			failures: 0,
			successes: 0,
			lastFailureTime: null,
			halfOpenCalls: 0,
		};
	}

	/**
	 * Executes a function with circuit breaker protection
	 */
	async execute<T>(fn: () => Promise<T>): Promise<T> {
		// Check if circuit should transition from OPEN to HALF_OPEN
		if (this.stats.state === "OPEN") {
			if (
				this.stats.lastFailureTime &&
				Date.now() - this.stats.lastFailureTime >= this.options.resetTimeout
			) {
				this.transitionToHalfOpen();
			} else {
				throw new Error(
					`Circuit breaker ${this.options.name} is OPEN - service unavailable`,
				);
			}
		}

		// Check if HALF_OPEN has exceeded max calls
		if (
			this.stats.state === "HALF_OPEN" &&
			this.stats.halfOpenCalls >= this.options.halfOpenMaxCalls
		) {
			// Too many calls in half-open, close circuit again
			this.transitionToOpen();
			throw new Error(
				`Circuit breaker ${this.options.name} exceeded HALF_OPEN call limit`,
			);
		}

		try {
			// Increment half-open calls if in HALF_OPEN state
			if (this.stats.state === "HALF_OPEN") {
				this.stats.halfOpenCalls += 1;
			}

			const result = await fn();
			this.onSuccess();
			return result;
		} catch (error) {
			this.onFailure();
			throw error;
		}
	}

	private onSuccess(): void {
		this.stats.failures = 0;
		this.stats.successes += 1;

		if (this.stats.state === "HALF_OPEN") {
			// Service recovered, close the circuit
			logger.info(
				{ circuitBreaker: this.options.name },
				"Circuit breaker transitioning to CLOSED - service recovered",
			);
			this.stats.state = "CLOSED";
			this.stats.halfOpenCalls = 0;
		}
	}

	private onFailure(): void {
		this.stats.failures += 1;
		this.stats.lastFailureTime = Date.now();

		if (
			this.stats.failures >= this.options.failureThreshold &&
			this.stats.state !== "OPEN"
		) {
			this.transitionToOpen();
		}
	}

	private transitionToOpen(): void {
		if (this.stats.state !== "OPEN") {
			logger.warn(
				{
					circuitBreaker: this.options.name,
					failures: this.stats.failures,
					threshold: this.options.failureThreshold,
				},
				"Circuit breaker transitioning to OPEN - service failing",
			);
			this.stats.state = "OPEN";
			this.stats.halfOpenCalls = 0;
		}
	}

	private transitionToHalfOpen(): void {
		logger.info(
			{ circuitBreaker: this.options.name },
			"Circuit breaker transitioning to HALF_OPEN - testing service recovery",
		);
		this.stats.state = "HALF_OPEN";
		this.stats.failures = 0;
		this.stats.halfOpenCalls = 0;
	}

	getState(): CircuitState {
		return this.stats.state;
	}

	getStats(): Readonly<CircuitBreakerStats> {
		return { ...this.stats };
	}
}

// Create circuit breaker instances for different services
export const strapiCircuitBreaker = new CircuitBreaker({
	name: "Strapi",
	failureThreshold: env.CIRCUIT_BREAKER_FAILURE_THRESHOLD,
	resetTimeout: env.CIRCUIT_BREAKER_RESET_TIMEOUT_MS,
	halfOpenMaxCalls: env.CIRCUIT_BREAKER_HALF_OPEN_MAX_CALLS,
});
