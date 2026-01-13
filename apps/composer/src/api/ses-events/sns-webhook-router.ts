import express, { type Router } from "express";
import { snsWebhookController } from "./sns-webhook-controller";

export const snsWebhookRouter: Router = express.Router();

// Update the route handler to match the path
snsWebhookRouter
	.route("/ses-event-to-strapi")
	.post((req, res, next) => {
		try {
			return snsWebhookController.handleSNSWebhook(req, res, next);
		} catch (error: any) {
			console.error("SNS Webhook Error:", error);
			res.status(500).send({ error: error.message });
		}
	})
	.all((req, res) => {
		res.status(405).json({
			success: false,
			message: `The requested webhook "${req.path.replace(/^\//, "")}" is not registered for ${req.method}, only for POST`,
		});
	});

snsWebhookRouter.post("/ses-event-to-strapi", (req, res, next) => {
	try {
		return snsWebhookController.handleSNSWebhook(req, res, next);
	} catch (error: any) {
		console.error("SNS Webhook Error:", error);
		res.status(500).send({ error: error.message });
	}
});
