import express, { type Router } from "express";
import { queueController } from "./queue-controller";

export const queueRouter: Router = express.Router();

queueRouter.get("/queue-data", (req, res, next) => {
	try {
		return queueController.getQueueData(req, res, next);
	} catch (error) {
		console.error(error);
		res.status(400).send({ error: error });
	}
});
