import express, { type Express } from "express";
import helmet from "helmet";
import { pino } from "pino";
import { healthCheckRouter } from "@/api/healthCheck/healthCheckRouter";
import errorHandler from "@/common/middleware/errorHandler";
import rateLimiter from "@/common/middleware/rateLimiter";
import requestLogger from "@/common/middleware/requestLogger";
import { env } from "@/common/utils/envConfig";
import "@/lib/workers/MassSendWorker";
import "./lib/workers/SendWorker";
import { serverAdapter } from "./views/BullBoard";

const logger = pino({ name: "server start" });

import path from "node:path";
import { snsWebhookRouter } from "@/api/sesEvents/snsWebhookRouter";
import { composerRouter } from "./api/composer/composerRouter";
import { queueRouter } from "./api/queue/queueRouter";
import { sendToChannelsRouter } from "./api/sendToChannels/sendRouter";
import { openAPIRouter } from "./api-docs/openAPIRouter";
import { initRabbitWorker } from "./scheduler/rabit-worker";

const __dirname = path.resolve();

console.log(__dirname);
const app: Express = express();
app.use(express.static(path.join(`${__dirname}/src`, "public")));

// Set the application to trust the reverse proxy
app.set("trust proxy", true);

// Middlewares
app.use(
	express.json({
		type: ["application/json", "text/plain"],
	}),
);
app.use(express.urlencoded({ extended: true }));
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

// Swagger UI
app.use(openAPIRouter);

// Error handlers
app.use(errorHandler());

initRabbitWorker();

export { app, logger };
