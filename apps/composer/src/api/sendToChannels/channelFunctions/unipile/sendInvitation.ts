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
import { env } from "@/common/utils/envConfig";
import { logEvent } from "../utils/logEvent";
import { checkMentions, replaceMentionsInText } from "../utils/Mentions";

export async function sendMessage(
	contact: Contact,
	composition: CompositionItem,
	account: UnipileIdentity,
): Promise<ServiceResponse<string | null>> {
	const settings = await settingsService.find(env.COMPOSER_STRAPI_API_TOKEN, {
		populate: "*",
	});
	if (!settings.success || !settings.data) {
		return ServiceResponse.failure(
			"Setting not found, probably Strapi is down",
			null,
			StatusCodes.INTERNAL_SERVER_ERROR,
		);
	}

	if (settings.data[0].subscription.toLowerCase() === "verify") {
		if (contact.subscriptions.length === 0) {
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
			return ServiceResponse.failure(
				"Contact has no Linkedin Invitation subscription",
				null,
				StatusCodes.BAD_REQUEST,
			);
		}

		if (!linkedinInvitesSubscription.active) {
			return ServiceResponse.failure(
				"Contact subscription is not active",
				null,
				StatusCodes.BAD_REQUEST,
			);
		}
	}

	if (settings.data[0].setting_credentials.length === 0) {
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
		return ServiceResponse.failure(
			"No Linkedin credentials found for your account",
			null,
			StatusCodes.INTERNAL_SERVER_ERROR,
		);
	}
	// Determine the recipient's phone number.
	const linkedin_url = contact.linkedin_url;
	if (!linkedin_url) {
		return ServiceResponse.failure(
			"No phone number available for contact",
			null,
			StatusCodes.BAD_REQUEST,
		);
	}
	try {
		let person_urn: string | null = linkedin_url;
		if (linkedin_url.startsWith("https")) {
			person_urn =
				linkedin_url.match(/linkedin\.com\/in\/([^/?#]+)/i)?.[1] || null;
		}
		if (!person_urn || person_urn === null) {
			return ServiceResponse.failure(
				"Cannot extarct person urn from linkedin url or no person urn provided",
				null,
				StatusCodes.BAD_REQUEST,
			);
		}

		const client = new UnipileClient(
			`https://${unipile_credentials.client_id}`,
			`${unipile_credentials.client_secret}`,
		);

		const atendee = await client.users.getProfile({
			account_id: account.account_id,
			identifier: person_urn,
			linkedin_sections: "*",
		});
		const response = await client.users.sendInvitation({
			account_id: account.account_id,
			provider_id: (atendee as any).provider_id,
			message: composition.result,
		});

		if (response.invitation_id) {
			await settingCredentialsService.update(
				unipile_credentials.documentId,
				{
					credential_status: "active",
					error_message: "",
				},
				env.COMPOSER_STRAPI_API_TOKEN,
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
		if (error.body.status === 422) {
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
	// Initialize formated_text with the original composition text
	let formated_text: string = composition.result || "";

	// Extract and replace mentions in formated_text, leaving composition.result unchanged.
	const { mentions } = await checkMentions(formated_text);
	formated_text = await replaceMentionsInText(formated_text, contact, mentions);

	const compositionForEmail = { ...composition, result: formated_text };

	const messageId = await sendMessage(contact, compositionForEmail, account);

	if (!messageId.success) {
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
	return ServiceResponse.success("Message sent", true, StatusCodes.OK);
}
