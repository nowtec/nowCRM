import dotenv from "dotenv";
import { cleanEnv, host, port, str, testOnly } from "envalid";

dotenv.config();

export const env = cleanEnv(process.env, {
  NODE_ENV: str({
    devDefault: testOnly("test"),
    choices: ["development", "production", "test"],
  }),
  PLUGINS_HOST: host({ devDefault: testOnly("localhost") }),
  PLUGINS_PORT: port({ default: 3030, devDefault: testOnly(3030) }),
  PLUGINS_RUNTIME_DIR: str({
    default: "/tmp/nowcrm-plugins-runtime",
    devDefault: testOnly("/tmp/nowcrm-plugins-runtime"),
  }),
  GITHUB_PACKAGES_TOKEN: str({ default: "", devDefault: testOnly("") }),
  GITHUB_PACKAGES_SCOPE: str({ default: "@nowtec", devDefault: testOnly("@nowtec") }),
  GITHUB_PACKAGES_REGISTRY: str({
    default: "https://npm.pkg.github.com",
    devDefault: testOnly("https://npm.pkg.github.com"),
  }),
});
