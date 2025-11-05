import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Router } from "express";
import { z } from "zod";
import { createApiResponse } from "@/api-docs/openAPIResponseBuilders";
import { queueController } from "./queueController";
import { QueueDataQuerySchema, QueueJobSchema } from "./queueModel";

export const queueRegistry = new OpenAPIRegistry();
export const queueRouter: Router = express.Router();

queueRegistry.registerPath({
	method: "get",
	path: "/api/queue-data",
	tags: ["DAL"],
	request: {
		query: QueueDataQuerySchema,
	},
	responses: createApiResponse(
		z.object({ jobs: z.array(QueueJobSchema) }),
		"Success",
		200,
	),
});

queueRouter.get("/queue-data", (req, res, next) => {
	try {
		return queueController.getQueueData(req, res, next);
	} catch (error) {
		console.error(error);
		res.status(400).send({ error: error });
	}
});
