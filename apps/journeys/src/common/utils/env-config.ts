import dotenv from "dotenv";
import { cleanEnv, host, num, port, str, testOnly } from "envalid";

dotenv.config();

export const env = cleanEnv(process.env, {
	NODE_ENV: str({
		devDefault: testOnly("test"),
		choices: ["development", "production", "test"],
	}),
	JOURNEYS_MINUTE_TO_LAUNCH: num({ devDefault: testOnly(5) }),
	JOURNEYS_HOST: host({ devDefault: testOnly("localhost") }),
	JOURNEYS_PORT: port({ devDefault: testOnly(3000) }),
	JOURNEYS_CORS_ORIGIN: str({ devDefault: testOnly("http://localhost:3000") }),
	JOURNEYS_COMMON_RATE_LIMIT_MAX_REQUESTS: num({ devDefault: testOnly(100) }),
	JOURNEYS_COMMON_RATE_LIMIT_WINDOW_MS: num({
		default: 60_000,
		devDefault: testOnly(60_000),
	}),
	JOURNEYS_STRAPI_API_TOKEN: str({ devDefault: testOnly("") }),
	JOURNEYS_CHECK_TIME: num({ devDefault: testOnly(1440) }),
	JOURNEYS_REDIS_PORT: port({ devDefault: testOnly(6379) }),
	JOURNEYS_REDIS_HOST: host({ devDefault: testOnly("localhost") }),
	JOURNEYS_REDIS_MAX_RETRIES: num({ devDefault: testOnly(3) }),
	JOURNEYS_REDIS_RETRY_DELAY_MS: num({ devDefault: testOnly(1000) }),
	JOURNEYS_REDIS_CONNECT_TIMEOUT: num({ devDefault: testOnly(10000) }),
	JOURNEYS_REDIS_COMMAND_TIMEOUT: num({ devDefault: testOnly(5000) }),
	JOURNEYS_REDIS_LAZY_CONNECT: num({
		devDefault: testOnly(0),
		choices: [0, 1],
	}),
	JOURNEYS_JOB_COMPLETED_LIFE_TIME_DAYS: num({ devDefault: testOnly(1) }),
	JOURNEYS_JOB_FAIL_LIFE_TIME_DAYS: num({ devDefault: testOnly(1) }),
	RABBITMQ_URL: str({
		devDefault: testOnly("amqp://guest:guest@localhost:5672"),
	}),
	STRAPI_URL: str({ devDefault: testOnly("http://localhost:1337") }),
	RABBITMQ_PREFETCH_COUNT: num({ devDefault: testOnly(10) }),
	RABBITMQ_RECONNECT_DELAY_MS: num({ devDefault: testOnly(5000) }),
	RABBITMQ_MAX_RECONNECT_ATTEMPTS: num({ devDefault: testOnly(10) }),
	RABBITMQ_CONSUMER_CONCURRENCY: num({ devDefault: testOnly(5) }),
	RABBITMQ_MAX_RETRIES: num({ devDefault: testOnly(3) }),
	RABBITMQ_RETRY_INITIAL_DELAY_MS: num({ devDefault: testOnly(1000) }),
	RABBITMQ_RETRY_MAX_DELAY_MS: num({ devDefault: testOnly(30000) }),
	REDIS_CLEANUP_CRON: str({ devDefault: testOnly("0 2 * * *") }), // Daily at 2 AM
	STRAPI_PAGINATION_MAX_PAGES: num({ devDefault: testOnly(100) }),
	STRAPI_PAGINATION_MAX_RECORDS: num({ devDefault: testOnly(10000) }),
	CIRCUIT_BREAKER_FAILURE_THRESHOLD: num({ devDefault: testOnly(5) }),
	CIRCUIT_BREAKER_RESET_TIMEOUT_MS: num({ devDefault: testOnly(60000) }),
	CIRCUIT_BREAKER_HALF_OPEN_MAX_CALLS: num({ devDefault: testOnly(3) }),
	API_GATEWAY: str({ devDefault: testOnly("http://localhost:8080") }),
	// Adaptive rate limiter configuration
	JOURNEYS_RATE_LIMITER_MIN_CONCURRENCY: num({ default: 2 }),
	JOURNEYS_RATE_LIMITER_MAX_CONCURRENCY: num({ default: 10 }), // Reduced from 30 to prevent oscillation
	JOURNEYS_RATE_LIMITER_INITIAL_CONCURRENCY: num({ default: 5 }), // Reduced from 10 to start more conservatively
	JOURNEYS_RATE_LIMITER_RESPONSE_WINDOW: num({ default: 50 }), // Increased from 30 to require more data points before adjusting
	JOURNEYS_RATE_LIMITER_RAMP_UP_THRESHOLD: num({ default: 250 }), // Lowered from 300 - ramp up only when consistently fast
	JOURNEYS_RATE_LIMITER_RAMP_DOWN_THRESHOLD: num({ default: 600 }), // Lowered from 800 - ramp down earlier to prevent overload
	JOURNEYS_RATE_LIMITER_CIRCUIT_BREAK_THRESHOLD: num({ default: 2000 }),
	JOURNEYS_RATE_LIMITER_MAX_CONSECUTIVE_ERRORS: num({ default: 10 }),
	JOURNEYS_RATE_LIMITER_MAX_CIRCUIT_RECOVERY: num({ default: 30000 }),
	JOURNEYS_RATE_LIMITER_STABILITY_ZONE_MIN: num({ default: 300 }), // Lower bound of stability zone (ms)
	JOURNEYS_RATE_LIMITER_STABILITY_ZONE_MAX: num({ default: 500 }), // Upper bound of stability zone (ms) - don't adjust if in this range
	JOURNEYS_RATE_LIMITER_MIN_ADJUSTMENT_INTERVAL_MS: num({ default: 10000 }), // Minimum 10 seconds between adjustments
	// Job key TTL configuration (in seconds)
	JOURNEYS_JOB_KEY_BASE_TTL_SECONDS: num({ default: 3600 }), // 1 hour base TTL
	JOURNEYS_JOB_KEY_MAX_TTL_SECONDS: num({ default: 2592000 }), // 30 days max TTL
	JOURNEYS_JOB_KEY_PROCESSING_BUFFER_SECONDS: num({ default: 300 }), // 5 minutes buffer for processing
	// Strapi request timeout configuration (in milliseconds)
	JOURNEYS_STRAPI_REQUEST_TIMEOUT_MS: num({ default: 120000 }), // 120 seconds (2 minutes) default timeout - allows for multiple API calls and slow responses
	// Timeout for findAll operations - these can legitimately take 60+ seconds when fetching many records
	// This is NOT an error condition, just expected behavior for large datasets
	JOURNEYS_STRAPI_FINDALL_TIMEOUT_MS: num({ default: 600000 }), // 600 seconds (10 minutes) - findAll operations can take a long time
	// Delayed consumer timeout configuration (in milliseconds)
	// Delayed consumer timeout should be longer than createNextJob timeout to avoid race conditions
	// When createNextJob times out, it republishes the message, so we need extra time for that
	JOURNEYS_DELAYED_CONSUMER_TIMEOUT_MS: num({ default: 240000 }), // 240 seconds (4 minutes) - longer than createNextJob timeout to allow for republishing
	// Subscription error retry configuration (in milliseconds)
	JOURNEYS_SUBSCRIPTION_ERROR_RETRY_DELAY_MS: num({ default: 3600000 }), // 24 hours default delay for subscription errors
	// Paused journey retry configuration (in milliseconds)
	JOURNEYS_PAUSED_JOURNEY_RETRY_DELAY_MS: num({ default: 3600000 }), // 1 hour default delay to check if paused journey was reactivated
	// Timeout for creating next job from wait step (in milliseconds)
	// Increased to account for lock retry logic (20 retries with exponential backoff can take 2-3 minutes under high contention)
	JOURNEYS_CREATE_NEXT_JOB_TIMEOUT_MS: num({ default: 180000 }), // 180 seconds (3 minutes) - allows for rate limiter queue wait, Strapi API calls, Redis operations, and lock retries
});

// Construct the Authorization header correctly
export const AUTH_HEADER = {
	Authorization: `Bearer ${env.JOURNEYS_STRAPI_API_TOKEN}`,
};
