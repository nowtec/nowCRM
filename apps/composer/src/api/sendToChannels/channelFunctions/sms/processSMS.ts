import {
	CommunicationChannel,
	type Composition,
	type ServiceResponse,
	type sendToChannelsData,
} from "@nowcrm/services";
import { processChannel } from "../utils/channelProcessor";
import { SMSMessage } from "./sendSms";
/**
 * Process SMS channel
 * @param data Channel data
 * @param composition Composition data
 * @returns ServiceResponse with success or failure
 */
export async function processSMSChannel(
	data: sendToChannelsData,
	composition: Composition,
): Promise<ServiceResponse<boolean | null>> {
	return processChannel(
		data,
		composition,
		CommunicationChannel.SMS,
		SMSMessage,
		"mobile_phone",
	);
}
