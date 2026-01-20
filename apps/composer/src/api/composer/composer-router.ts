import express, { type Router } from "express";
import { composerController } from "./composer-controller";

export const composerRouter: Router = express.Router();

export const userRouter: Router = express.Router();

composerRouter.post("/create-reference", (req, res, next) => {
	try {
		return composerController.createReference(req, res, next);
	} catch (error) {
		console.log(error);
		res.status(400).send({ error: error });
	}
});

composerRouter.post("/create-composition", (req, res, next) => {
	try {
		return composerController.createComposition(req, res, next);
	} catch (error) {
		res.status(400).send({ error: error });
	}
});

composerRouter.post("/regenerate", (req, res, next) => {
	try {
		return composerController.regenerate(req, res, next);
	} catch (error) {
		res.status(400).send({ error: error });
	}
});

composerRouter.post("/quick-write", (req, res, next) => {
	try {
		return composerController.quickWrite(req, res, next);
	} catch (error) {
		res.status(400).send({ error: error });
	}
});

composerRouter.post("/structured-response", (req, res, next) => {
	try {
		return composerController.getStructuredResponse(req, res, next);
	} catch (error) {
		res.status(400).send({ error: error });
	}
});
