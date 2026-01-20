import express, { type Router } from "express";
import { massActionsController } from "./mass-actions-controller";

export const massActionsRouter: Router = express.Router();

massActionsRouter.post("/delete", (req, res, next) => {
	try {
		return massActionsController.delete(req, res, next);
	} catch (error) {
		res.status(400).send({ error });
	}
});

massActionsRouter.post("/update", (req, res, next) => {
	try {
		return massActionsController.update(req, res, next);
	} catch (error) {
		res.status(400).send({ error });
	}
});

massActionsRouter.post("/export", (req, res, next) => {
	try {
		return massActionsController.export(req, res, next);
	} catch (error) {
		res.status(400).send({ error });
	}
});

massActionsRouter.post("/anonymize", (req, res, next) => {
	try {
		return massActionsController.anonymize(req, res, next);
	} catch (error) {
		res.status(400).send({ error });
	}
});

massActionsRouter.post("/add-to-list", (req, res, next) => {
	try {
		return massActionsController.addToList(req, res, next);
	} catch (error) {
		res.status(400).send({ error });
	}
});

massActionsRouter.post("/add-to-organization", (req, res, next) => {
	try {
		return massActionsController.addToOrganization(req, res, next);
	} catch (error) {
		res.status(400).send({ error });
	}
});

massActionsRouter.post("/add-to-journey", (req, res, next) => {
	try {
		return massActionsController.addToJourney(req, res, next);
	} catch (error) {
		res.status(400).send({ error });
	}
});

massActionsRouter.post("/update-subscription", (req, res, next) => {
	try {
		return massActionsController.updateSubscription(req, res, next);
	} catch (error) {
		res.status(400).send({ error });
	}
});
