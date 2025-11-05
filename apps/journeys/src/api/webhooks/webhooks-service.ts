import { ServiceResponse, type triggerData } from "@nowcrm/services";
import { StatusCodes } from "http-status-codes";
import { publishToTriggerQueue } from "@/rabbitmq";
import { logger } from "@/server";

export class ComposerServiceApi {
	async handleTrigger(
		_triggerData: triggerData,
	): Promise<ServiceResponse<{ result: string } | null>> {
		try {
			// we do not check redis data when handling this trigger because each update anyways will be different
			// so we can ignore redis keys checking
			publishToTriggerQueue("TRIGGER", _triggerData);
			return ServiceResponse.success("", null);
		} catch (error: any) {
			logger.error(error);
			return ServiceResponse.failure(
				`${error.message}`,
				null,
				StatusCodes.INTERNAL_SERVER_ERROR,
			);
		}
	}
}

export const composerServiceApi = new ComposerServiceApi();
