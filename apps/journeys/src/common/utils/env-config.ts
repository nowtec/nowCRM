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
	JOURNEYS_REDIS_LAZY_CONNECT: num({ devDefault: testOnly(0), choices: [0, 1] }),
	JOURNEYS_JOB_COMPLETED_LIFE_TIME_DAYS: num({ devDefault: testOnly(1) }),
	JOURNEYS_JOB_FAIL_LIFE_TIME_DAYS: num({ devDefault: testOnly(1) }),
	RABBITMQ_URL: str({
		devDefault: testOnly("amqp://guest:guest@localhost:5672"),
	}),
	RABBITMQ_PREFETCH_COUNT: num({ devDefault: testOnly(10) }),
	RABBITMQ_RECONNECT_DELAY_MS: num({ devDefault: testOnly(5000) }),
	RABBITMQ_MAX_RECONNECT_ATTEMPTS: num({ devDefault: testOnly(10) }),
	RABBITMQ_CONSUMER_CONCURRENCY: num({ devDefault: testOnly(5) }),
	RABBITMQ_MAX_RETRIES: num({ devDefault: testOnly(3) }),
	RABBITMQ_RETRY_INITIAL_DELAY_MS: num({ devDefault: testOnly(1000) }),
	RABBITMQ_RETRY_MAX_DELAY_MS: num({ devDefault: testOnly(30000) }),
	COMPOSER_URL: str({ devDefault: testOnly("http://localhost:3020") }),
	STRAPI_URL: str({ devDefault: testOnly("http://localhost:1337/api/") }),
});

// Construct the Authorization header correctly
export const AUTH_HEADER = {
	Authorization: `Bearer ${env.JOURNEYS_STRAPI_API_TOKEN}`,
};
