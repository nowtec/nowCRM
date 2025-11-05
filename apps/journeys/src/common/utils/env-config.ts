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
	JOURNEYS_JOB_COMPLETED_LIFE_TIME_DAYS: num({ devDefault: testOnly(1) }),
	JOURNEYS_JOB_FAIL_LIFE_TIME_DAYS: num({ devDefault: testOnly(1) }),
	JOURNEYS_SESSION_SECRET: str({ devDefault: testOnly("secret") }),
	RABBITMQ_URL: str({
		devDefault: testOnly("amqp://guest:guest@localhost:5672"),
	}),
	COMPOSER_URL: str({ devDefault: testOnly("http://localhost:3020") }),
	STRAPI_URL: str({ devDefault: testOnly("http://localhost:1337/api/") }),
});

// Construct the Authorization header correctly
export const AUTH_HEADER = {
	Authorization: `Bearer ${env.JOURNEYS_STRAPI_API_TOKEN}`,
};
