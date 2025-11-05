import express, { type Express } from "express";
import helmet from "helmet";

import { healthCheckRouter, webhooksRouter } from "@/api";
import {
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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
	triggerConsumer();
	startJourneyScheduler();
	logger.info("Job processing (RabbitMQ + cron) initialized");
}

initJobs().catch((err) => {
	logger.error(
		"Failed to init job processors: RabbitMQ connection could not be initialied",
		err,
	);
	process.exit(1);
});

export { app, logger };
