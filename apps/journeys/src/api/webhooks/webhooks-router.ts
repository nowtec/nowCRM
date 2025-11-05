import express, { type Router } from "express";
import { WebhookController } from "./webhooks-controller";

export const webhooksRouter: Router = express.Router();

webhooksRouter.post("/trigger", (req, res, next) => {
	try {
		return WebhookController.handleTrigger(req, res, next);
	} catch (error) {
		console.log(error);
		res.status(400).send({ error: error });
	}
});
