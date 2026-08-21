import express, { type Express } from "express";
import helmet from "helmet";

import { healthCheckRouter, webhooksRouter } from "@/api";
import {
	contactUpdateConsumer,
	delayedConsumer,
	jobConsumer,
	journeyConsumer,
	ruleConsumer,
	triggerConsumer,
} from "@/consumers";
import { startJourneyScheduler } from "@/cron";
import { setupRabbitMQ } from "@/rabbitmq";
import errorHandler from "./common/middleware/error-handler";
import rateLimiter from "./common/middleware/rate-limiter";
import requestLogger from "./common/middleware/request-logger";
import { logger } from "./logger";

const app: Express = express();
app.set("trust proxy", true);

// Strapi webhook payloads carry the whole entry with its relations, so a
// mass import or a large list blows past Express' 100kb default.
const BODY_LIMIT = "25mb";

app.use(express.json({ limit: BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: BODY_LIMIT }));

app.use(helmet());
app.use(rateLimiter);

app.use(requestLogger);

app.use("/health-check", healthCheckRouter);
app.use("/webhooks", webhooksRouter);

app.use(errorHandler());

// —— Initialize RabbitMQ, consumers & cron ——
async function initJobs() {
	await setupRabbitMQ();
	journeyConsumer();
	jobConsumer();
	ruleConsumer();
	delayedConsumer();
	contactUpdateConsumer();
	triggerConsumer();
	startJourneyScheduler();
	logger.info("Job processing (RabbitMQ + cron) initialized");
}

initJobs().catch((err) => {
	const errorMessage = err instanceof Error ? err.message : String(err);
	const errorStack = err instanceof Error ? err.stack : undefined;

	logger.error(
		{
			err,
			errorMessage,
			errorStack,
			rabbitmqUrl: process.env.RABBITMQ_URL?.replace(/:[^:@]+@/, ":****@"), // Hide password
		},
		"Failed to init job processors: RabbitMQ connection could not be initialized",
	);

	// Give a helpful error message
	if (
		errorMessage.includes("ECONNREFUSED") ||
		errorMessage.includes("ENOTFOUND")
	) {
		logger.error("RabbitMQ server appears to be unreachable. Please check:");
		logger.error("1. Is RabbitMQ running?");
		logger.error("2. Is RABBITMQ_URL environment variable set correctly?");
		logger.error(
			`3. Current RABBITMQ_URL: ${process.env.RABBITMQ_URL?.replace(/:[^:@]+@/, ":****@") || "NOT SET"}`,
		);
	}

	process.exit(1);
});

export { app, logger };
