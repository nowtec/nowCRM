import {
	CommunicationChannel,
	type Composition,
	ServiceResponse,
	type sendToChannelsData,
} from "@nowcrm/services";
import { StatusCodes } from "http-status-codes";
import { logger } from "@/server";
import { processChannel } from "../utils/channel-processor";
import { LinkedInInvitation } from "./send-invitation";
/**
 * Process LinkedIn invitations channel (Unipile)
 * @param data Channel data
 * @param composition Composition data
 * @returns ServiceResponse with success or failure
 */
export async function processLinkedInInvitationsChannel(
	data: sendToChannelsData,
	composition: Composition,
): Promise<ServiceResponse<boolean | null>> {
	const { account } = data;
	logger.info(
		{
			compositionId: composition.documentId,
			channel: CommunicationChannel.LINKEDIN_INVTITATIONS,
			type: data.type,
			toType: Array.isArray(data.to) ? "array" : typeof data.to,
			toCount: Array.isArray(data.to) ? data.to.length : undefined,
			toPreview:
				typeof data.to === "string" || typeof data.to === "number"
					? data.to
					: undefined,
			hasAccount: !!account,
			unipileIdentityDocumentId: account?.documentId,
			unipileIdentityName: account?.name,
			unipileAccountId: account?.account_id,
		},
		"[Unipile LinkedIn Invitations] Starting channel flow",
	);

	if (!account) {
		logger.error(
			{
				compositionId: composition.documentId,
				type: data.type,
				to: data.to,
			},
			"[Unipile LinkedIn Invitations] Missing Unipile identity in request",
		);
		return ServiceResponse.failure(
			"Missing Unipile identity account for LinkedIn invitations",
			null,
			StatusCodes.BAD_REQUEST,
		);
	}

	const result = await processChannel(
		data,
		composition,
		CommunicationChannel.LINKEDIN_INVTITATIONS,
		LinkedInInvitation,
		"linkedin_url",
		[account],
	);
	if (result.success) {
		logger.info(
			{
				compositionId: composition.documentId,
				message: result.message,
				statusCode: result.statusCode,
			},
			"[Unipile LinkedIn Invitations] Channel flow completed",
		);
	} else {
		logger.warn(
			{
				compositionId: composition.documentId,
				message: result.message,
				statusCode: result.statusCode,
			},
			"[Unipile LinkedIn Invitations] Channel flow failed",
		);
	}
	return result;
}
