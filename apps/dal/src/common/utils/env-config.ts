import dotenv from "dotenv";
import { bool, cleanEnv, host, num, port, str, testOnly } from "envalid";

dotenv.config();

export const env = cleanEnv(process.env, {
	NODE_ENV: str({
		devDefault: testOnly("test"),
		choices: ["development", "production", "test"],
	}),
	DAL_MINUTE_TO_LAUNCH: num({ devDefault: testOnly(5) }),
	DAL_HOST: host({ devDefault: testOnly("localhost") }),
	DAL_PORT: port({ devDefault: testOnly(3000) }),
	DAL_CORS_ORIGIN: str({ devDefault: testOnly("http://localhost:3000") }),
	DAL_COMMON_RATE_LIMIT_MAX_REQUESTS: num({ devDefault: testOnly(100) }),
	DAL_STRAPI_API_TOKEN: str({ devDefault: testOnly("") }),
	DAL_CHECK_TIME: num({ devDefault: testOnly(1440) }),
	DAL_REDIS_PORT: port({ devDefault: testOnly(6379) }),
	DAL_STRAPI_API_URL: str({
		devDefault: testOnly("http://localhost:1337/api/"),
	}),
	DAL_JOB_CONCURRENCY: num({ devDefault: testOnly(1) }),
	DAL_WORKER_COUNT: num({ devDefault: testOnly(4) }),
	DAL_REDIS_HOST: host({ devDefault: testOnly("localhost") }),
	DAL_REDIS_PASSWORD: str({ devDefault: testOnly("default") }),
	DAL_JOB_COMPLETED_LIFE_TIME_DAYS: num({ devDefault: testOnly(1) }),
	DAL_JOB_FAIL_LIFE_TIME_DAYS: num({ devDefault: testOnly(1) }),
	DAL_BASIC_AUTH_USERNAME: str({ devDefault: testOnly("admin") }),
	DAL_BASIC_AUTH_PASSWORD: str({ devDefault: testOnly("admin") }),
	DAL_SESSION_SECRET: str({ devDefault: testOnly("secret") }),
	DAL_DATABASE_CLIENT: str({ devDefault: testOnly("postgresql") }),
	DAL_DATABASE_HOST: host({ devDefault: testOnly("localhost") }),
	DAL_DATABASE_PORT: port({ devDefault: testOnly(5433) }),
	DAL_DATABASE_NAME: str({ devDefault: testOnly("name") }),
	DAL_DATABASE_USERNAME: str({ devDefault: testOnly("username") }),
	DAL_DATABASE_PASSWORD: str({ devDefault: testOnly("password") }),
	DAL_DATABASE_RDS: bool({ devDefault: testOnly(false) }),
	DAL_DATABASE_SSL_SELF: bool({ devDefault: testOnly(false) }),
	DAL_SMTP_HOST: host({ devDefault: testOnly("localhost") }),
	DAL_SMTP_PORT: port({ devDefault: testOnly(587) }),
	DAL_SMTP_USER: str({ devDefault: testOnly("username") }),
	DAL_SMTP_PASS: str({ devDefault: testOnly("password") }),
	DAL_SMTP_FROM: str({ devDefault: testOnly("") }),
	STRAPI_URL: str({ devDefault: testOnly("http://localhost:1337/api/") }),
	COMPOSER_URL: str({ devDefault: testOnly("http://localhost:3020/") }),
	RABBITMQ_URL: str({
		devDefault: testOnly("amqp://guest:guest@localhost:5672"),
	}),
});

// Construct the Authorization header correctly
export const AUTH_HEADER = {
	Authorization: `Bearer ${env.DAL_STRAPI_API_TOKEN}`,
};
