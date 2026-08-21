import express, { type Express } from "express";
import helmet from "helmet";
import { pino } from "pino";
import { healthCheckRouter } from "@/api/healthCheck/healt-check-router";
import errorHandler from "@/common/middleware/error-handler";
import rateLimiter from "@/common/middleware/rate-limiter";
import requestLogger from "@/common/middleware/request-logger";
import "@/lib/workers/mass-send-worker";
import "./lib/workers/send-worker";
import { serverAdapter } from "./views/bull-board";

const logger = pino({ name: "server start" });

import path from "node:path";
import { snsWebhookRouter } from "@/api/ses-events/sns-webhook-router";
import { composerRouter } from "./api/composer/composer-router";
import { queueRouter } from "./api/queue/queue-router";
import { sendToChannelsRouter } from "./api/sendToChannels/send-router";
import { initRabbitWorker } from "./scheduler/rabit-worker";

const __dirname = path.resolve();

console.log(__dirname);
const app: Express = express();
app.use(express.static(path.join(`${__dirname}/src`, "public")));

// Set the application to trust the reverse proxy
app.set("trust proxy", true);

// Mass sends and SES/SNS batches exceed Express' 100kb default body limit.
const BODY_LIMIT = "25mb";

// Middlewares
app.use(
	express.json({
		type: ["application/json", "text/plain"],
		limit: BODY_LIMIT,
	}),
);
app.use(express.urlencoded({ extended: true, limit: BODY_LIMIT }));
//app.use(cors({ origin: env.COMPOSER_CORS_ORIGIN, credentials: true }));
app.use(helmet());
app.use(rateLimiter);

// Request logging
app.use(requestLogger);

app.use("/health-check", healthCheckRouter);
app.use("/admin/queues", serverAdapter.getRouter());
app.use("/composer", composerRouter);
app.use("/send-to-channels", sendToChannelsRouter);
app.use("/webhook", snsWebhookRouter);
app.use("/admin/queues/api", queueRouter);

// Error handlers
app.use(errorHandler());

initRabbitWorker();

export { app, logger };
