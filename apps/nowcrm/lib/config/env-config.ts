import { NotEmptyStringValidator, URLValidator } from "@nowcrm/services";
import { bool, cleanEnv, str, testOnly } from "envalid";

// this needed is because nodejs env handler inside nextjs is wroking not how envalid expect
const processEnv = {
	NODE_ENV: process.env.NODE_ENV || "",
	CRM_BASE_URL: process.env.CRM_BASE_URL || "",
	AUTH_SECRET: process.env.AUTH_SECRET || "",
	AUTH_URL: process.env.AUTH_URL || "",
	AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST || false,
	STRAPI_URL: process.env.STRAPI_URL || "",
	CRM_STRAPI_API_TOKEN: process.env.CRM_STRAPI_API_TOKEN || "",
	COMPOSER_URL: process.env.COMPOSER_URL || "",
	DAL_URL: process.env.DAL_URL || "",
	JOURNEYS_URL: process.env.JOURNEYS_URL || "",
	API_GATEWAY: process.env.API_GATEWAY || "",
	CRM_TOTP_ENCRYPTION_KEY: process.env.CRM_TOTP_ENCRYPTION_KEY || "",
	NT_STACK_VERSION: process.env.NT_STACK_VERSION || "",
	TEST_RUN: process.env.TEST_RUN || false,
	S3_ACCESS_KEY: process.env.S3_ACCESS_KEY || "",
	S3_SECRET_KEY: process.env.S3_SECRET_KEY || "",
	S3_ENDPOINT: process.env.S3_ENDPOINT || "",
	S3_BUCKET: process.env.S3_BUCKET || "",
	S3_PUBLIC_URL_BASE: process.env.S3_PUBLIC_URL_BASE || "",
};

export const env = cleanEnv(processEnv, {
	NODE_ENV: NotEmptyStringValidator({
		default: "production",
		choices: ["development", "production", "test"],
	}),
	CRM_BASE_URL: URLValidator({ default: "http://localhost:3000" }),
	// this 2 env do not have prefix crm cause next-auth by default detect them like this
	AUTH_SECRET: NotEmptyStringValidator({
		default: "pZsHmI9P7wcs03/BEuFtMxi9HbSuyCwyknuyx7BIads=",
	}),
	AUTH_URL: URLValidator({
		default: "http://localhost:3000/api/auth",
	}),

	AUTH_TRUST_HOST: bool({ default: false }),
	TEST_RUN: bool({ default: false }),
	CRM_STRAPI_API_TOKEN: NotEmptyStringValidator(),
	CRM_TOTP_ENCRYPTION_KEY: NotEmptyStringValidator(),
	NT_STACK_VERSION: NotEmptyStringValidator(),
	STRAPI_URL: URLValidator({
		devDefault: testOnly("http://localhost:1337/api/"),
	}),
	COMPOSER_URL: URLValidator({
		devDefault: testOnly("http://localhost:3020/"),
	}),
	DAL_URL: URLValidator({
		devDefault: testOnly("http://localhost:6001/api/"),
	}),
	JOURNEYS_URL: URLValidator({
		devDefault: testOnly("http://localhost:3010/"),
	}),
	API_GATEWAY: URLValidator({
		devDefault: testOnly("http://localhost:8080"),
	}),
	//  Optional S3 settings (no error if not set)
	S3_ACCESS_KEY: str({ default: "" }),
	S3_SECRET_KEY: str({ default: "" }),
	S3_ENDPOINT: str({ default: "" }),
	S3_BUCKET: str({ default: "" }),
	S3_PUBLIC_URL_BASE: str({ default: "" }),
});
