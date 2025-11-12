import express, { type Express } from "express";
import helmet from "helmet";
import { pino } from "pino";
import { healthCheckRouter } from "@/api/health-check/health-check-router";
import { openAPIRouter } from "@/api-docs/open-API-router";
import errorHandler from "@/common/middleware/error-handler";
import rateLimiter from "@/common/middleware/rate-limiter";
import requestLogger from "@/common/middleware/request-logger";
import "./jobs_pipeline/start-workers";

const logger = pino({ name: "server start" });

import path from "node:path";

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
app.use(helmet());
app.use(rateLimiter);

// Request logging
app.use(requestLogger);

app.use("/health-check", healthCheckRouter);
// Swagger UI

app.use(openAPIRouter);

// Error handlers
app.use(errorHandler());

export { app, logger };
