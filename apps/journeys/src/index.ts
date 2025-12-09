import { env } from "@/common/utils/env-config";
import { app, logger } from "@/server";

// Handle unhandled promise rejections to prevent silent failures
// This helps identify issues that might prevent message acknowledgments
process.on("unhandledRejection", (reason, promise) => {
	logger.error(
		{
			reason,
			promise: promise.toString(),
			stack: reason instanceof Error ? reason.stack : undefined,
		},
		"Unhandled promise rejection - this may cause unacked messages in RabbitMQ",
	);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
	logger.error(
		{ err: error, stack: error.stack },
		"Uncaught exception - this may cause unacked messages in RabbitMQ",
	);
	// Don't exit immediately - let the process handle it normally
});

const server = app.listen(env.JOURNEYS_PORT, () => {
	const { NODE_ENV, JOURNEYS_HOST, JOURNEYS_PORT } = env;
	logger.info(
		`Server (${NODE_ENV}) running on port http://${JOURNEYS_HOST}:${JOURNEYS_PORT}`,
	);
});

const onCloseSignal = async () => {
	logger.info("sigint received, shutting down");

	// Close RabbitMQ connections gracefully
	try {
		const { closeRabbitMQ } = await import("./rabbitmq/index.js");
		await closeRabbitMQ();
	} catch (err) {
		logger.error({ err }, "Error closing RabbitMQ");
	}

	server.close(() => {
		logger.info("server closed");
		process.exit();
	});
	setTimeout(() => process.exit(1), 10000).unref(); // Force shutdown after 10s
};

process.on("SIGINT", onCloseSignal);
process.on("SIGTERM", onCloseSignal);
