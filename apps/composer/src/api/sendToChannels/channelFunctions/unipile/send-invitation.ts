import {
	CommunicationChannel,
	type CompositionItem,
	type Contact,
	ServiceResponse,
	type UnipileIdentity,
} from "@nowcrm/services";
import {
	settingCredentialsService,
	settingsService,
} from "@nowcrm/services/server";
import { StatusCodes } from "http-status-codes";
import { UnipileClient } from "unipile-node-sdk";
import { env } from "@/common/utils/env-config";
import { logger } from "@/server";
import { logEvent } from "../utils/log-event";
import { checkMentions, replaceMentionsInText } from "../utils/mention";

export async function sendMessage(
	contact: Contact,
	composition: CompositionItem,
	account: UnipileIdentity,
): Promise<ServiceResponse<string | null>> {
	logger.info(
		{
			contactId: contact.documentId,
			contactName: [contact.first_name, contact.last_name]
				.filter(Boolean)
				.join(" "),
			compositionItemId: composition.documentId,
			channelName: composition.channel?.name,
			hasMessage: !!composition.result,
			messageLength: composition.result?.length || 0,
			unipileIdentityDocumentId: account?.documentId,
			unipileIdentityName: account?.name,
			unipileAccountId: account?.account_id,
		},
		"[Unipile LinkedIn Invitation] Preparing invitation send",
	);
	if (!account?.account_id) {
		logger.error(
			{
				contactId: contact.documentId,
				compositionItemId: composition.documentId,
			},
			"[Unipile LinkedIn Invitation] Missing Unipile account_id",
		);
		return ServiceResponse.failure(
			"Missing Unipile account ID for LinkedIn invitation",
			null,
			StatusCodes.BAD_REQUEST,
		);
	}
	const settings = await settingsService.find(env.COMPOSER_STRAPI_API_TOKEN, {
		populate: "*",
	});
	if (!settings.success || !settings.data) {
		logger.error(
			{
				contactId: contact.documentId,
				compositionItemId: composition.documentId,
				status: settings.status,
				errorMessage: settings.errorMessage,
			},
			"[Unipile LinkedIn Invitation] Failed to load settings",
		);
		return ServiceResponse.failure(
			"Setting not found, probably Strapi is down",
			null,
			StatusCodes.INTERNAL_SERVER_ERROR,
		);
	}

	if (settings.data[0].subscription.toLowerCase() === "verify") {
		logger.info(
			{
				contactId: contact.documentId,
				compositionItemId: composition.documentId,
			},
			"[Unipile LinkedIn Invitation] Verifying contact subscription",
		);
		if (contact.subscriptions.length === 0) {
			logger.warn(
				{ contactId: contact.documentId },
				"[Unipile LinkedIn Invitation] Contact has no subscriptions",
			);
			return ServiceResponse.failure(
				"Contact has no subscription",
				null,
				StatusCodes.PARTIAL_CONTENT,
			);
		}
		const linkedinInvitesSubscription = contact.subscriptions?.find((item) =>
			item.channel.name
				.toLowerCase()
				.includes(
					CommunicationChannel.LINKEDIN_INVTITATIONS.toLocaleLowerCase(),
				),
		);

		if (!linkedinInvitesSubscription) {
			logger.warn(
				{ contactId: contact.documentId },
				"[Unipile LinkedIn Invitation] Contact has no LinkedIn invitation subscription",
			);
			return ServiceResponse.failure(
				"Contact has no Linkedin Invitation subscription",
				null,
				StatusCodes.BAD_REQUEST,
			);
		}

		if (!linkedinInvitesSubscription.active) {
			logger.warn(
				{ contactId: contact.documentId },
				"[Unipile LinkedIn Invitation] Contact LinkedIn invitation subscription is inactive",
			);
			return ServiceResponse.failure(
				"Contact subscription is not active",
				null,
				StatusCodes.BAD_REQUEST,
			);
		}
	}

	if (settings.data[0].setting_credentials.length === 0) {
		logger.error(
			{
				contactId: contact.documentId,
				compositionItemId: composition.documentId,
			},
			"[Unipile LinkedIn Invitation] No setting credentials configured",
		);
		return ServiceResponse.failure(
			"Strapi token badly configured for Composer service",
			null,
			StatusCodes.PARTIAL_CONTENT,
		);
	}

	const unipile_credentials = settings.data[0].setting_credentials.find(
		(item) =>
			item.name.toLowerCase() === CommunicationChannel.UNIPILE.toLowerCase(),
	);

	if (!unipile_credentials) {
		logger.error(
			{
				contactId: contact.documentId,
				compositionItemId: composition.documentId,
			},
			"[Unipile LinkedIn Invitation] Unipile credentials not found",
		);
		return ServiceResponse.failure(
			"No Linkedin credentials found for your account",
			null,
			StatusCodes.INTERNAL_SERVER_ERROR,
		);
	}
	// Determine the recipient LinkedIn URL / identifier.
	const linkedin_url = contact.linkedin_url;
	if (!linkedin_url) {
		logger.warn(
			{
				contactId: contact.documentId,
				compositionItemId: composition.documentId,
			},
			"[Unipile LinkedIn Invitation] Contact has no LinkedIn URL",
		);
		return ServiceResponse.failure(
			"No LinkedIn URL available for contact",
			null,
			StatusCodes.BAD_REQUEST,
		);
	}
	try {
		logger.info(
			{
				contactId: contact.documentId,
				linkedinUrl: linkedin_url,
				unipileAccountId: account.account_id,
			},
			"[Unipile LinkedIn Invitation] Resolving LinkedIn person identifier",
		);
		let person_urn: string | null = linkedin_url;
		if (linkedin_url.startsWith("https")) {
			person_urn =
				linkedin_url.match(/linkedin\.com\/in\/([^/?#]+)/i)?.[1] || null;
		}
		if (!person_urn || person_urn === null) {
			logger.warn(
				{
					contactId: contact.documentId,
					linkedinUrl: linkedin_url,
				},
				"[Unipile LinkedIn Invitation] Could not extract person identifier from LinkedIn URL",
			);
			return ServiceResponse.failure(
				"Cannot extract person identifier from LinkedIn URL and no person identifier was provided",
				null,
				StatusCodes.BAD_REQUEST,
			);
		}
		logger.info(
			{
				contactId: contact.documentId,
				personIdentifier: person_urn,
				unipileAccountId: account.account_id,
			},
			"[Unipile LinkedIn Invitation] Loading LinkedIn profile from Unipile",
		);

		const client = new UnipileClient(
			`https://${unipile_credentials.client_id}`,
			`${unipile_credentials.client_secret}`,
		);

		const atendee = await client.users.getProfile({
			account_id: account.account_id,
			identifier: person_urn,
			linkedin_sections: "*",
		});
		logger.info(
			{
				contactId: contact.documentId,
				unipileAccountId: account.account_id,
				providerId: (atendee as any)?.provider_id,
			},
			"[Unipile LinkedIn Invitation] LinkedIn profile loaded",
		);
		logger.info(
			{
				contactId: contact.documentId,
				unipileAccountId: account.account_id,
				providerId: (atendee as any)?.provider_id,
				messageLength: composition.result?.length || 0,
			},
			"[Unipile LinkedIn Invitation] Sending invitation via Unipile",
		);
		const response = await client.users.sendInvitation({
			account_id: account.account_id,
			provider_id: (atendee as any).provider_id,
			message: composition.result,
		});
		logger.info(
			{
				contactId: contact.documentId,
				unipileAccountId: account.account_id,
				invitationId: (response as any)?.invitation_id,
			},
			"[Unipile LinkedIn Invitation] sendInvitation response received",
		);

		if (response.invitation_id) {
			await settingCredentialsService.update(
				unipile_credentials.documentId,
				{
					credential_status: "active",
					error_message: "",
				},
				env.COMPOSER_STRAPI_API_TOKEN,
			);
			logger.info(
				{
					contactId: contact.documentId,
					invitationId: response.invitation_id,
				},
				"[Unipile LinkedIn Invitation] Invitation sent successfully",
			);
			return ServiceResponse.success(
				"Linkedin Invitation sent",
				null,
				StatusCodes.OK,
			);
		}
		return ServiceResponse.failure(
			"Something went wrong",
			"",
			StatusCodes.BAD_REQUEST,
		);
	} catch (error: any) {
		logger.error(
			{
				contactId: contact.documentId,
				compositionItemId: composition.documentId,
				unipileAccountId: account.account_id,
				errorMessage: error?.message,
				errorStatus: error?.status,
				errorCode: error?.code,
				errorBody: error?.body,
				stack: error?.stack,
			},
			"[Unipile LinkedIn Invitation] Failed to send invitation",
		);
		if (error?.body?.status === 422) {
			return ServiceResponse.failure(
				error.body.detail,
				null,
				StatusCodes.INTERNAL_SERVER_ERROR,
			);
		}

		await settingCredentialsService.update(
			unipile_credentials.documentId,
			{
				credential_status: "invalid",
				error_message:
					error.message ||
					`Unknown error occurred when sending Linkedin Invitation message - ${error}`,
			},
			env.COMPOSER_STRAPI_API_TOKEN,
		);
		return ServiceResponse.failure(
			error.message ||
				`Unknown error occurred when sending Linkedin Invitation message - ${error}`,
			null,
			StatusCodes.INTERNAL_SERVER_ERROR,
		);
	}
}

export async function LinkedInInvitation(
	composition: CompositionItem,
	contact: Contact,
	account: UnipileIdentity,
): Promise<ServiceResponse<boolean>> {
	logger.info(
		{
			contactId: contact.documentId,
			compositionItemId: composition.documentId,
			unipileAccountId: account?.account_id,
		},
		"[Unipile LinkedIn Invitation] Starting contact invitation flow",
	);
	// Initialize formated_text with the original composition text
	let formated_text: string = composition.result || "";

	// Extract and replace mentions in formated_text, leaving composition.result unchanged.
	const { mentions } = await checkMentions(formated_text);
	formated_text = await replaceMentionsInText(formated_text, contact, mentions);
	logger.info(
		{
			contactId: contact.documentId,
			compositionItemId: composition.documentId,
			mentionsCount: mentions.length,
			originalLength: composition.result?.length || 0,
			finalLength: formated_text.length,
		},
		"[Unipile LinkedIn Invitation] Mentions processed",
	);

	const compositionForEmail = { ...composition, result: formated_text };

	const messageId = await sendMessage(contact, compositionForEmail, account);

	if (!messageId.success) {
		logger.warn(
			{
				contactId: contact.documentId,
				compositionItemId: composition.documentId,
				message: messageId.message,
				statusCode: messageId.statusCode,
			},
			"[Unipile LinkedIn Invitation] Contact invitation flow failed",
		);
		return ServiceResponse.failure(
			messageId.message,
			false,
			StatusCodes.INTERNAL_SERVER_ERROR,
		);
	}
	await logEvent(
		contact,
		composition.documentId,
		composition.channel.documentId,
		"LinkedinInvitation",
		messageId.responseObject,
	);
	logger.info(
		{
			contactId: contact.documentId,
			compositionItemId: composition.documentId,
		},
		"[Unipile LinkedIn Invitation] Contact invitation flow completed",
	);
	return ServiceResponse.success("Message sent", true, StatusCodes.OK);
}
