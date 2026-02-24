import type { Request, RequestHandler, Response } from "express";
import { handleServiceResponse } from "@/common/utils/http-handlers";
import { logger } from "@/server";
import type { SNSMessage } from "./sns-webhook-model";
import { snsWebhookServiceApi } from "./sns-webhook-service";

class SNSWebhookController {
	private parseSNSMessage(wrapper: any): SNSMessage {
		if (typeof wrapper?.body === "string") {
			try {
				return JSON.parse(wrapper.body) as SNSMessage;
			} catch (parseError) {
				logger.error(`SNS parse failed: ${parseError}`);
				throw new Error("Invalid SNS message format");
			}
		}

		return wrapper as SNSMessage;
	}

	public handleSNSWebhook: RequestHandler = async (
		req: Request,
		res: Response,
	) => {
		try {
			const wrappers: any[] = Array.isArray(req.body) ? req.body : [req.body];
			logger.info(`SNS Webhook received: messages=${wrappers.length}`);

			let lastResponse: Awaited<
				ReturnType<typeof snsWebhookServiceApi.processSNSMessage>
			> | null = null;
			let failedCount = 0;

			for (const wrapper of wrappers) {
				const snsMessage = this.parseSNSMessage(wrapper);
				const serviceResponse =
					await snsWebhookServiceApi.processSNSMessage(snsMessage);

				if (!serviceResponse.success) {
					failedCount += 1;
					logger.error(
						`SNS message failed: type=${snsMessage.Type} reason=${serviceResponse.message}`,
					);
				}

				lastResponse = serviceResponse;
			}

			if (wrappers.length === 1 && lastResponse) {
				return handleServiceResponse(lastResponse, res);
			}

			if (failedCount > 0) {
				return res.status(207).json({
					success: false,
					message: `Processed ${wrappers.length - failedCount}/${wrappers.length} SNS messages`,
				});
			}

			return res.status(200).json({
				success: true,
				message: `Processed ${wrappers.length} SNS messages`,
			});
		} catch (error: any) {
			logger.error(`SNS Webhook Error: ${error.message}`);
			res.status(400).json({
				success: false,
				message: "Failed to process SNS webhook",
				error: error.message,
			});
		} finally {
			if (!res.headersSent) {
				res.sendStatus(200);
			}
		}
	};
}

export const snsWebhookController = new SNSWebhookController();
