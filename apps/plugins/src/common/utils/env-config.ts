import dotenv from "dotenv";
import { cleanEnv, host, num, port, str, testOnly } from "envalid";

dotenv.config();

export const env = cleanEnv(process.env, {
	NODE_ENV: str({
		devDefault: testOnly("test"),
		choices: ["development", "production", "test"],
	}),
	PLUGINS_HOST: host({ devDefault: testOnly("localhost") }),
	PLUGINS_PORT: port({ devDefault: testOnly(3030) }),
	PLUGINS_CORS_ORIGIN: str({ devDefault: testOnly("http://localhost:3000") }),
	PLUGINS_COMMON_RATE_LIMIT_MAX_REQUESTS: num({ devDefault: testOnly(100) }),

	// Plugin configuration
	PLUGINS_NPMRC_TOKEN: str({ devDefault: testOnly("") }),
	PLUGINS_GIT_TOKEN: str({ devDefault: testOnly("") }),
	PLUGINS_PACKAGE_NAMES: str({ devDefault: testOnly("") }),
	PLUGINS_INSTALL_DIR: str({ devDefault: testOnly("./plugins") }),
	
	// Python plugin configuration
	PLUGINS_PYTHON_PATH: str({ devDefault: testOnly("python3") }),
	PLUGINS_PYTHON_VENV_DIR: str({ devDefault: testOnly("./plugins/python-venv") }),

	API_GATEWAY: str({ devDefault: testOnly("http://localhost:8080/") }),
	PLUGINS_STRAPI_API_TOKEN: str({ devDefault: testOnly("") }),
	STRAPI_URL: str({ devDefault: testOnly("http://localhost:1337/api") }),
});
