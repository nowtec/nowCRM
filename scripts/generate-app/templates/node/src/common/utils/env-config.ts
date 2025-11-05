import dotenv from "dotenv";
import { cleanEnv, host, num, port, str, testOnly } from "envalid";

dotenv.config();

export const env = cleanEnv(process.env, {
	NODE_ENV: str({
		devDefault: testOnly("test"),
		choices: ["development", "production", "test"],
	}),
	NODE_APP_HOST: host({ devDefault: testOnly("localhost") }),
	NODE_APP_PORT: port({ devDefault: testOnly(3000) }),
	NODE_APP_CORS_ORIGIN: str({ devDefault: testOnly("http://localhost:3000") }),
	NODE_APP_COMMON_RATE_LIMIT_MAX_REQUESTS: num({ devDefault: testOnly(100) }),


});
