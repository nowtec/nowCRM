import type { Request, RequestHandler, Response } from "express";
import { handleServiceResponse } from "@/common/utils/http-handlers";
import { logger } from "@/server";
import type {
	MassAddToJourneyPayload,
	MassAddToListPayload,
	MassAddToOrganizationPayload,
	MassAnonymizePayload,
	MassDeletePayload,
	MassExportPayload,
	MassUpdatePayload,
	MassUpdateSubscriptionPayload,
} from "./mass-actions-model";
import { massActionsServiceApi } from "./mass-actions-service";

class MassActionsController {
	public delete: RequestHandler = async (req: Request, res: Response) => {
		const serviceResponse = await massActionsServiceApi.deleteItems(
			req.body as MassDeletePayload,
		);
		if (!serviceResponse.success) logger.error(serviceResponse);
		handleServiceResponse(serviceResponse, res);
	};

	public addToList: RequestHandler = async (req: Request, res: Response) => {
		const serviceResponse = await massActionsServiceApi.addToList(
			req.body as MassAddToListPayload,
		);
		if (!serviceResponse.success) logger.error(serviceResponse);
		handleServiceResponse(serviceResponse, res);
	};

	public addToOrganization: RequestHandler = async (
		req: Request,
		res: Response,
	) => {
		const serviceResponse = await massActionsServiceApi.addToOrganization(
			req.body as MassAddToOrganizationPayload,
		);
		if (!serviceResponse.success) logger.error(serviceResponse);
		handleServiceResponse(serviceResponse, res);
	};

	public addToJourney: RequestHandler = async (req: Request, res: Response) => {
		const serviceResponse = await massActionsServiceApi.addToJourney(
			req.body as MassAddToJourneyPayload,
		);
		if (!serviceResponse.success) logger.error(serviceResponse);
		handleServiceResponse(serviceResponse, res);
	};

	public anonymize: RequestHandler = async (req: Request, res: Response) => {
		const serviceResponse = await massActionsServiceApi.anonymize(
			req.body as MassAnonymizePayload,
		);
		if (!serviceResponse.success) logger.error(serviceResponse);
		handleServiceResponse(serviceResponse, res);
	};

	public update: RequestHandler = async (req: Request, res: Response) => {
		const serviceResponse = await massActionsServiceApi.update(
			req.body as MassUpdatePayload,
		);
		if (!serviceResponse.success) logger.error(serviceResponse);
		handleServiceResponse(serviceResponse, res);
	};

	public updateSubscription: RequestHandler = async (
		req: Request,
		res: Response,
	) => {
		const serviceResponse = await massActionsServiceApi.updateSubscription(
			req.body as MassUpdateSubscriptionPayload,
		);
		if (!serviceResponse.success) logger.error(serviceResponse);
		handleServiceResponse(serviceResponse, res);
	};

	public export: RequestHandler = async (req: Request, res: Response) => {
		const serviceResponse = await massActionsServiceApi.export(
			req.body as MassExportPayload,
		);
		if (!serviceResponse.success) logger.error(serviceResponse);
		handleServiceResponse(serviceResponse, res);
	};
}

export const massActionsController = new MassActionsController();
