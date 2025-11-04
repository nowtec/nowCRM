import { env } from "@/common/utils/env-config";
import { app, logger } from "@/server";

const server = app.listen(env.JOURNEYS_PORT, () => {
	const { NODE_ENV, JOURNEYS_HOST, JOURNEYS_PORT } = env;
	logger.info(
		`Server (${NODE_ENV}) running on port http://${JOURNEYS_HOST}:${JOURNEYS_PORT}`,
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
