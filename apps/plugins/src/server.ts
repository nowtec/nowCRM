import express, { type Express } from "express";
import helmet from "helmet";
import { pino } from "pino";
import { healthCheckRouter } from "@/api/health-check/health-check-router";
import errorHandler from "@/common/middleware/error-handler";
import rateLimiter from "@/common/middleware/rate-limiter";
import requestLogger from "@/common/middleware/request-logger";

const logger = pino({ name: "server start" });

const app: Express = express();

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

// Error handlers
app.use(errorHandler());

export { app, logger };
