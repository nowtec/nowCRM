import dotenv from "dotenv";
import { cleanEnv, host, num, port, str, testOnly } from "envalid";

dotenv.config();

export const env = cleanEnv(process.env, {
	NODE_ENV: str({
		devDefault: testOnly("test"),
		choices: ["development", "production", "test"],
	}),
	COMPOSER_HOST: host({ devDefault: testOnly("localhost") }),
	COMPOSER_PORT: port({ devDefault: testOnly(3000) }),
	COMPOSER_CORS_ORIGIN: str({ devDefault: testOnly("http://localhost:3000") }),
	COMPOSER_COMMON_RATE_LIMIT_MAX_REQUESTS: num({ devDefault: testOnly(100) }),

	COMPOSER_CRM_REDIRECT_HEALTH_CHECK: str({
		devDefault: testOnly("http://localhost:3000/crm/admin-panel/channels"),
	}),

	COMPOSER_URL: str({ devDefault: testOnly("http://localhost:3020/") }),
	STRAPI_URL: str({ devDefault: testOnly("http://localhost:1337/api/") }),
	COMPOSER_STRAPI_API_TOKEN: str({ devDefault: testOnly("") }),

	COMPOSER_REDIS_PORT: port({ devDefault: testOnly(6379) }),
	COMPOSER_REDIS_HOST: host({ devDefault: testOnly("localhost") }),
	COMPOSER_REDIS_PASSWORD: str({ devDefault: testOnly("default") }),

	COMPOSER_BASIC_AUTH_USERNAME: str({ devDefault: testOnly("admin") }),
	COMPOSER_BASIC_AUTH_PASSWORD: str({ devDefault: testOnly("admin") }),
	COMPOSER_SESSION_SECRET: str({ devDefault: testOnly("secret") }),

	COMPOSER_OPENAI_API_KEY: str({ devDefault: testOnly("") }),
	COMPOSER_ANTHROPIC_KEY: str({ devDefault: testOnly("") }),

	// used for email smtp connection
	COMPOSER_SMTP_HOST: str({ devDefault: testOnly("") }),
	COMPOSER_SMTP_PORT: port({ devDefault: testOnly(18000) }),
	COMPOSER_SMTP_USER: str({ devDefault: testOnly("") }),
	COMPOSER_SMTP_PASS: str({ devDefault: testOnly("") }),
	CUSTOMER_DOMAIN: str({ devDefault: testOnly("") }),
	RABBITMQ_URL: str({
		devDefault: testOnly("amqp://guest:guest@localhost:5672"),
	}),
	COMPOSER_CUSTOMER_IDENTITY: str({ devDefault: testOnly("") }),
});

// Construct the Authorization header correctly
export const AUTH_HEADER = {
	Authorization: `Bearer ${env.COMPOSER_STRAPI_API_TOKEN}`,
};

export const CALLBACK_URL_LINKEDIN =
	env.NODE_ENV === "development"
		? `http://${env.COMPOSER_HOST}:${env.COMPOSER_PORT}/send-to-channels/callback/linkedin`
		: `https://${env.COMPOSER_HOST}.${env.CUSTOMER_DOMAIN}/send-to-channels/callback/linkedin`;

export const CALLBACK_URL_TWITTER =
	env.NODE_ENV === "development"
		? `http://${env.COMPOSER_HOST}:${env.COMPOSER_PORT}/send-to-channels/callback/twitter`
		: `https://${env.COMPOSER_HOST}.${env.CUSTOMER_DOMAIN}/send-to-channels/callback/twitter`;

export const CALLBACK_URL_UNIPILE =
	env.NODE_ENV === "development"
		? `http://${env.COMPOSER_HOST}:${env.COMPOSER_PORT}/send-to-channels/callback/unipile`
		: `https://${env.COMPOSER_HOST}.${env.CUSTOMER_DOMAIN}/send-to-channels/callback/unipile`;

export const TELEGRAM_API_BASE = "https://api.telegram.org";
