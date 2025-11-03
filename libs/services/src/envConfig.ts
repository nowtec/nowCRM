import { cleanEnv, testOnly } from "envalid";
import { NotEmptyStringValidator } from "./zod-validators/non-empty-string";
import { URLValidator } from "./zod-validators/url-validator";

// this needed is because nodejs env handler inside nextjs is not working how envalid expect
const processEnv = {
	NODE_ENV: process.env.NODE_ENV || "",
	STRAPI_URL: process.env.STRAPI_URL || "",
	COMPOSER_URL: process.env.COMPOSER_URL || "",
};

export const envServices = cleanEnv(processEnv, {
	NODE_ENV: NotEmptyStringValidator({
		devDefault: testOnly("test"),
		choices: ["development", "production", "test"],
	}),
	STRAPI_URL: URLValidator({ devDefault: testOnly("http://localhost:1337") }),
	COMPOSER_URL: URLValidator({ devDefault: testOnly("http://localhost:3020") }),
});
