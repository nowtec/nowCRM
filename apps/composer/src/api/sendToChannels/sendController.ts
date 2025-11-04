import type { sendToChannelsData } from "@nowcrm/services";
import type { Request, RequestHandler, Response } from "express";
import { handleServiceResponse } from "@/common/utils/httpHandlers";
import { runHealthCheck } from "./channelFunctions/healthCheck";
import { generateRefreshUrlLinkedIn } from "./channelFunctions/linkedIn/callback";
import { generateRefreshUrlTwitter } from "./channelFunctions/twitter/callback";
import { generateAccessURLUnipile } from "./channelFunctions/unipile/loginFlow";
import { sendToChannelsService } from "./sendService";

class SendController {
	public sendToChannels: RequestHandler = async (
		req: Request,
		res: Response,
	) => {
		const serviceResponse = await sendToChannelsService.sendToChannels(
			req.body as sendToChannelsData,
		);
		handleServiceResponse(serviceResponse, res);
	};

	public getRefreshUrlLinkedIn: RequestHandler = async (
		_req: Request,
		res: Response,
	) => {
		const serviceResponse = await generateRefreshUrlLinkedIn();
		handleServiceResponse(serviceResponse, res);
	};

	public getRefreshUrlTwitter: RequestHandler = async (
		_req: Request,
		res: Response,
	) => {
		const serviceResponse = await generateRefreshUrlTwitter();
		handleServiceResponse(serviceResponse, res);
	};

	public getRefreshUrlUnipile: RequestHandler = async (
		req: Request,
		res: Response,
	) => {
		const query = req.query;
		const serviceResponse = await generateAccessURLUnipile(
			query.name as string,
			query.reconnect_account as string,
		);
		handleServiceResponse(serviceResponse, res);
	};

	public runHealthCheck: RequestHandler = async (
		_req: Request,
		res: Response,
	) => {
		const serviceResponse = await runHealthCheck();
		handleServiceResponse(serviceResponse, res);
	};
}

export const sendController = new SendController();
