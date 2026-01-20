import express, { type Express } from "express";
import helmet from "helmet";
import { pino } from "pino";
import { healthCheckRouter } from "@/api/health-check/health-check-router";
import uploadRouter from "@/api/import/upload-csv";
import importProgressRouter from "@/api/import-progress";
import { massActionsRouter } from "@/api/mass-actions/mass-actions-router";
import errorHandler from "@/common/middleware/error-handler";
import rateLimiter from "@/common/middleware/rate-limiter";
import requestLogger from "@/common/middleware/request-logger";
import "./jobs_pipeline/start-workers";

import path from "node:path";
import { queueRouter } from "./api/queue/queue-router";
import { serverAdapter } from "./views/bull-board";

const logger = pino({ name: "server start" });
const __dirname = path.resolve();

console.log(__dirname);
const app: Express = express();
app.use(
	"/admin/queues",
	(_req, _res, next) => {
		next();
	},
	serverAdapter.getRouter(),
);

app.use("/api", queueRouter);
app.use(express.static(path.join(`${__dirname}/src`, "public")));

// Set the application to trust the reverse proxy
app.set("trust proxy", true);

app.use(helmet());
app.use(rateLimiter);
app.use(requestLogger);

app.use("/", uploadRouter);
// Middlewares
app.use(
	express.json({
		type: ["application/json", "text/plain"],
	}),
);
app.use(express.urlencoded({ extended: true }));

app.use("/mass-actions", massActionsRouter);
app.use("/health-check", healthCheckRouter);
app.use("/", importProgressRouter);

// Error handlers
app.use(errorHandler());

export { app, logger };
