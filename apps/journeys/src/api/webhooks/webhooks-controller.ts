import type { Request, RequestHandler, Response } from "express";
import { handleServiceResponse } from "@/common/utils/http-handlers";
import { logger } from "@/server";
import { composerServiceApi } from "./webhooks-service";

class webhookController {
	public handleTrigger: RequestHandler = async (
		req: Request,
		res: Response,
	) => {
		const serviceResponse = await composerServiceApi.handleTrigger(req.body);
		if (!serviceResponse.success) logger.error(serviceResponse);
		handleServiceResponse(serviceResponse, res);
	};
}

export const WebhookController = new webhookController();
