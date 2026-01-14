import { cleanEnv, testOnly } from "envalid";
import { NotEmptyStringValidator } from "./zod-validators/non-empty-string";
import { URLValidator } from "./zod-validators/url-validator";

// this needed is because nodejs env handler inside nextjs is not working how envalid expect
const processEnv = {
	NODE_ENV: process.env.NODE_ENV || "",
	API_GATEWAY: process.env.API_GATEWAY || "",
	STRAPI_URL: process.env.STRAPI_URL || "",
	COMPOSER_URL: process.env.COMPOSER_URL || "",
	DAL_URL: process.env.DAL_URL || "",
	JOURNEYS_URL: process.env.JOURNEYS_URL || "",
};

export const envServices = cleanEnv(processEnv, {
	NODE_ENV: NotEmptyStringValidator({
		devDefault: testOnly("test"),
		choices: ["development", "production", "test"],
	}),
	API_GATEWAY: URLValidator({ devDefault: testOnly("http://localhost:8080") }),
	STRAPI_URL: URLValidator({ devDefault: testOnly("http://localhost:1337") }),
	COMPOSER_URL: URLValidator({ devDefault: testOnly("http://localhost:3020") }),
	DAL_URL: URLValidator({ devDefault: testOnly("http://localhost:6001") }),
	JOURNEYS_URL: URLValidator({
		devDefault: testOnly("http://localhost:3010/"),
	}),
});
