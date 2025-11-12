import type { Request, RequestHandler, Response } from "express";
import { handleServiceResponse } from "@/common/utils/http-handlers";
import { logger } from "@/server";
import { queueServiceApi } from "./queue-service";

class QueueController {
	public getQueueData: RequestHandler = async (req: Request, res: Response) => {
		const serviceResponse = await queueServiceApi.getQueueData(req.query);

		if (!serviceResponse.success) logger.error(serviceResponse);

		handleServiceResponse(serviceResponse, res);
	};
}

export const queueController = new QueueController();
