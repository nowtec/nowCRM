import express, { type Express } from "express";
import helmet from "helmet";
import { pino } from "pino";
import { healthCheckRouter } from "@/api/health-check/health-check-router";
import { pluginsRouter } from "@/api/plugins/plugins-router";

const logger = pino({ name: "plugins-server" });
const app: Express = express();

app.set("trust proxy", true);
app.use(express.json({ type: ["application/json", "text/plain"] }));
app.use(express.urlencoded({ extended: true }));
app.use(helmet());

app.use("/health-check", healthCheckRouter);
app.use("/plugins", pluginsRouter);

export { app, logger };
