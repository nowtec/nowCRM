import { env } from "@/common/utils/env-config";
import { app, logger } from "@/server";

const server = app.listen(env.PLUGINS_PORT, () => {
  logger.info(
    `Plugins service (${env.NODE_ENV}) running on http://${env.PLUGINS_HOST}:${env.PLUGINS_PORT}`,
  );
});

const onCloseSignal = () => {
  logger.info("sigint received, shutting down");
  server.close(() => {
    logger.info("server closed");
    process.exit();
  });
  setTimeout(() => process.exit(1), 10000).unref();
};

process.on("SIGINT", onCloseSignal);
process.on("SIGTERM", onCloseSignal);
