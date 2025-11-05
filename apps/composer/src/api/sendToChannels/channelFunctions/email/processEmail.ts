import {
	CommunicationChannel,
	type Composition,
	ServiceResponse,
	type sendToChannelsData,
} from "@nowcrm/services";
import { StatusCodes } from "http-status-codes";
import { processChannel } from "../utils/channelProcessor";
import { emailPost } from "./sendEmail";

/**
 * Process email channel
 * @param data Channel data
 * @param composition Composition data
 * @returns ServiceResponse with success or failure
 */
export async function processEmailChannel(
	data: sendToChannelsData,
	composition: Composition,
): Promise<ServiceResponse<boolean | null>> {
	const { from, subject } = data;

	// Validate required fields specific to email
	if (!from || !subject) {
		return ServiceResponse.failure(
			"Subject or email from is missing",
			null,
			StatusCodes.BAD_REQUEST,
		);
	}

	return processChannel(
		data,
		composition,
		CommunicationChannel.EMAIL,
		emailPost,
		"email",
		[
			composition.add_unsubscribe,
			from,
			subject,
			data?.ignoreSubscription || false,
		],
	);
}
