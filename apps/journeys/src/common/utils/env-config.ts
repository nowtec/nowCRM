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
	JOURNEYS_RATE_LIMITER_MIN_CONCURRENCY: num({ default: 5 }),
	JOURNEYS_RATE_LIMITER_MAX_CONCURRENCY: num({ default: 30 }),
	JOURNEYS_RATE_LIMITER_INITIAL_CONCURRENCY: num({ default: 10 }),
	JOURNEYS_RATE_LIMITER_RESPONSE_WINDOW: num({ default: 30 }),
	JOURNEYS_RATE_LIMITER_RAMP_UP_THRESHOLD: num({ default: 300 }),
	JOURNEYS_RATE_LIMITER_RAMP_DOWN_THRESHOLD: num({ default: 800 }),
	JOURNEYS_RATE_LIMITER_CIRCUIT_BREAK_THRESHOLD: num({ default: 2000 }),
	JOURNEYS_RATE_LIMITER_MAX_CONSECUTIVE_ERRORS: num({ default: 10 }),
	JOURNEYS_RATE_LIMITER_MAX_CIRCUIT_RECOVERY: num({ default: 30000 }),
	// Job key TTL configuration (in seconds)
	JOURNEYS_JOB_KEY_BASE_TTL_SECONDS: num({ default: 3600 }), // 1 hour base TTL
	JOURNEYS_JOB_KEY_MAX_TTL_SECONDS: num({ default: 2592000 }), // 30 days max TTL
	JOURNEYS_JOB_KEY_PROCESSING_BUFFER_SECONDS: num({ default: 300 }), // 5 minutes buffer for processing
	// Strapi request timeout configuration (in milliseconds)
	JOURNEYS_STRAPI_REQUEST_TIMEOUT_MS: num({ default: 30000 }), // 30 seconds default timeout
});

// Construct the Authorization header correctly
export const AUTH_HEADER = {
	Authorization: `Bearer ${env.JOURNEYS_STRAPI_API_TOKEN}`,
};
