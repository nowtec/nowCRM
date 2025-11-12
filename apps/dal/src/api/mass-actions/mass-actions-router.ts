import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Router } from "express";
import { z } from "zod";
import { createApiResponse } from "@/api-docs/open-API-responseBuilders";
import { massActionsController } from "./mass-actions-controller";
import {
	MassAddToJourneySchema,
	MassAddToListSchema,
	MassAddToOrganizationSchema,
	MassAnonymizeSchema,
	MassDeleteSchema,
	MassExportSchema,
	MassUpdateSchema,
	MassUpdateSubscriptionSchema,
} from "./mass-actions-model";

export const massActionsRegistry = new OpenAPIRegistry();
export const massActionsRouter: Router = express.Router();

massActionsRegistry.register("MassDeleteRequest", MassDeleteSchema);
massActionsRegistry.register("MassAddToListRequest", MassAddToListSchema);
massActionsRegistry.register(
	"MassAddToOrganizationRequest",
	MassAddToOrganizationSchema,
);
massActionsRegistry.register("MassAddToJourneyRequest", MassAddToJourneySchema);

massActionsRegistry.registerPath({
	method: "post",
	path: "/mass-actions/delete",
	tags: ["Mass Actions"],
	request: {
		body: {
			content: {
				"application/json": {
					schema: MassDeleteSchema,
				},
			},
		},
	},
	responses: createApiResponse(z.object({ count: z.number() }), "Success", 200),
});

massActionsRegistry.registerPath({
	method: "post",
	path: "/mass-actions/add-to-list",
	tags: ["Mass Actions"],
	request: {
		body: {
			content: {
				"application/json": {
					schema: MassAddToListSchema,
				},
			},
		},
	},
	responses: createApiResponse(z.object({ count: z.number() }), "Success", 200),
});

massActionsRegistry.registerPath({
	method: "post",
	path: "/mass-actions/update-subscription",
	tags: ["Mass Actions"],
	request: {
		body: {
			content: {
				"application/json": {
					schema: MassUpdateSubscriptionSchema,
				},
			},
		},
	},
	responses: createApiResponse(z.object({ count: z.number() }), "Success", 200),
});

massActionsRegistry.registerPath({
	method: "post",
	path: "/mass-actions/add-to-organization",
	tags: ["Mass Actions"],
	request: {
		body: {
			content: {
				"application/json": {
					schema: MassAddToOrganizationSchema,
				},
			},
		},
	},
	responses: createApiResponse(z.object({ count: z.number() }), "Success", 200),
});

massActionsRegistry.registerPath({
	method: "post",
	path: "/mass-actions/add-to-journey",
	tags: ["Mass Actions"],
	request: {
		body: {
			content: {
				"application/json": {
					schema: MassAddToJourneySchema,
				},
			},
		},
	},
	responses: createApiResponse(z.object({ count: z.number() }), "Success", 200),
});

massActionsRegistry.registerPath({
	method: "post",
	path: "/mass-actions/export",
	tags: ["Mass Actions"],
	request: {
		body: {
			content: {
				"application/json": {
					schema: MassExportSchema,
				},
			},
		},
	},
	responses: createApiResponse(z.object({ count: z.number() }), "Success", 200),
});

massActionsRegistry.registerPath({
	method: "post",
	path: "/mass-actions/update",
	tags: ["Mass Actions"],
	request: {
		body: {
			content: {
				"application/json": {
					schema: MassUpdateSchema,
				},
			},
		},
	},
	responses: createApiResponse(z.object({ count: z.number() }), "Success", 200),
});

massActionsRegistry.registerPath({
	method: "post",
	path: "/mass-actions/anonymize",
	tags: ["Mass Actions"],
	request: {
		body: {
			content: {
				"application/json": {
					schema: MassAnonymizeSchema,
				},
			},
		},
	},
	responses: createApiResponse(z.object({ count: z.number() }), "Success", 200),
});

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
