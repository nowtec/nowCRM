import { env } from "@/common/utils/env-config";
import { initializePlugins } from "@/lib/plugin-manager";
import { app, logger } from "@/server";

// Initialize plugins on startup
initializePlugins()
	.then(() => {
		logger.info("Plugins initialized successfully");
	})
	.catch((error) => {
		logger.error({ error }, "Failed to initialize plugins");
		// Continue starting the server even if plugin initialization fails
	});

const server = app.listen(env.PLUGINS_PORT, () => {
	const { NODE_ENV, PLUGINS_HOST, PLUGINS_PORT } = env;
	logger.info(
		`Server (${NODE_ENV}) running on port http://${PLUGINS_HOST}:${PLUGINS_PORT}`,
	);
});

const onCloseSignal = () => {
	logger.info("sigint received, shutting down");
	server.close(() => {
		logger.info("server closed");
		process.exit();
	});
	setTimeout(() => process.exit(1), 10000).unref(); // Force shutdown after 10s
};

process.on("SIGINT", onCloseSignal);
process.on("SIGTERM", onCloseSignal);
