import dotenv from "dotenv";
import { cleanEnv, host, num, port, str, testOnly } from "envalid";

dotenv.config();

export const env = cleanEnv(process.env, {
	NODE_ENV: str({
		devDefault: testOnly("test"),
		choices: ["development", "production", "test"],
	}),
	JOURNEYS_HOST: host({ devDefault: testOnly("localhost") }),
	JOURNEYS_PORT: port({ devDefault: testOnly(3000) }),
	JOURNEYS_CORS_ORIGIN: str({ devDefault: testOnly("http://localhost:3000") }),
	JOURNEYS_COMMON_RATE_LIMIT_MAX_REQUESTS: num({ devDefault: testOnly(100) }),


});
