import {
	CommunicationChannel,
	type CompositionItem,
	type Contact,
	ServiceResponse,
} from "@nowcrm/services";
import { settingsService } from "@nowcrm/services/server";
import { StatusCodes } from "http-status-codes";
import * as nodemailer from "nodemailer";
import type * as SMTPTransport from "nodemailer/lib/smtp-transport";
import { env } from "@/common/utils/envConfig";
import { inlineLinkAndUnderlineStyles } from "../utils/formatStyle";
import { logEvent, logUnpublishedEvent } from "../utils/logEvent";
import { checkMentions, replaceMentionsInText } from "../utils/Mentions";

export async function sendEmail(
	email_from: string,
	contact: Contact,
	subject: string,
	composition: CompositionItem,
	ignoreSubscription: boolean,
): Promise<ServiceResponse<string | null>> {
	// one is until settings migrates to each user
	const settings = await settingsService.find(env.COMPOSER_STRAPI_API_TOKEN);

	if (!settings.success || !settings.data) {
		return ServiceResponse.failure(
			"Setting not found, probably Strapi is down",
			null,
			StatusCodes.INTERNAL_SERVER_ERROR,
		);
	}

	if (
		settings.data[0].subscription === "verify" &&
		ignoreSubscription === false
	) {
		if (contact.subscriptions.length === 0) {
			await logUnpublishedEvent(
				contact,
				composition.documentId,
				composition.channel.documentId,
				"Email",
			);
			return ServiceResponse.failure(
				"Contact has no subscription",
				null,
				StatusCodes.BAD_REQUEST,
			);
		}
		const emailSubscription = contact.subscriptions.find((item) =>
			item.channel.name
				.toLowerCase()
				.includes(CommunicationChannel.EMAIL.toLowerCase()),
		);
		if (!emailSubscription) {
			await logUnpublishedEvent(
				contact,
				composition.documentId,
				composition.channel.documentId,
				"Email",
			);
			return ServiceResponse.failure(
				"Contact has no subscription",
				null,
				StatusCodes.BAD_REQUEST,
			);
		}
		if (!emailSubscription.active) {
			await logUnpublishedEvent(
				contact,
				composition.documentId,
				composition.channel.documentId,
				"Email",
			);
			return ServiceResponse.failure(
				"Contact has subscription, but it is not active",
				null,
				StatusCodes.BAD_REQUEST,
			);
		}
	}

	const transporter = nodemailer.createTransport({
		host: env.COMPOSER_SMTP_HOST,
		port: env.COMPOSER_SMTP_PORT,
		secure: false, // true for 465, false for other ports
		auth: {
			user: env.COMPOSER_SMTP_USER,
			pass: env.COMPOSER_SMTP_PASS,
		},
	} as SMTPTransport.Options);

	const attachments =
		composition.attached_files?.map((file) => ({
			filename: file.name,
			path: file.url,
		})) || [];

	const mailOptions = {
		from: email_from,
		to: contact.email,
		subject: subject,
		html: composition.result, // Notice this will now use our updated text
		attachments, // add attachments here
		headers: {
			"X-SES-MESSAGE-TAGS": `composition_id=${composition.documentId},channel=${composition.channel.documentId}`,
			"X-Composition-Id": composition.documentId.toString(),
			"X-Composition-Channel-Id": composition.channel.documentId.toString(),
		},
	};
	try {
		const info = await transporter.sendMail(mailOptions);
		return ServiceResponse.success(
			`Email sent ${info.accepted}`,
			info.messageId,
			StatusCodes.OK,
		);
	} catch (error: any) {
		return ServiceResponse.failure(
			`Error during sending: ${error.message}`,
			null,
			StatusCodes.INTERNAL_SERVER_ERROR,
		);
	}
}

export async function emailPost(
	composition: CompositionItem,
	contact: Contact,
	addUnsubscribe: boolean,
	email_from: string,
	title: string,
	ignoreSubscription: boolean,
): Promise<ServiceResponse<boolean>> {
	let formated_text = composition.result || "";
	let formated_subject = title || "";

	// Extract and replace mentions in formated_text, leaving composition.result unchanged.
	const { mentions } = await checkMentions(formated_text);
	formated_text = await replaceMentionsInText(formated_text, contact, mentions);

	const subject_mention_data = await checkMentions(formated_subject);
	formated_subject = await replaceMentionsInText(
		formated_subject,
		contact,
		subject_mention_data.mentions,
	);

	// Fetch settings to handle unsubscribe text.
	const settings = await settingsService.find(env.COMPOSER_STRAPI_API_TOKEN);
	if (!settings.data || !settings.success || settings.errorMessage) {
		return ServiceResponse.failure(
			settings.errorMessage as string,
			false,
			StatusCodes.INTERNAL_SERVER_ERROR,
		);
	}

	if (addUnsubscribe) {
		const unsubscribeText = settings.data[0].unsubscribe_text;
		if (unsubscribeText === "" || !unsubscribeText) {
			return ServiceResponse.failure(
				"You have active add Unsubscribe text, but unsubscribe text in settings is empty",
				false,
				StatusCodes.BAD_REQUEST,
			);
		}
		if (!unsubscribeText.includes("@contact.email")) {
			return ServiceResponse.failure(
				"You have active add Unsubscribe text, but unsubscribe text in settings doesnt have @contact.email",
				false,
				StatusCodes.BAD_REQUEST,
			);
		}
		// Replace email placeholders in the unsubscribe text.
		const processedUnsubscribeText = unsubscribeText
			.replaceAll("@contact.email", contact.email)
			.replaceAll("%40contact.email", contact.email)
			.replaceAll("@composition.id", composition.id?.toString() || "")
			.replaceAll("@composition.channel.name", composition.channel?.name || "");
		formated_text += processedUnsubscribeText;
	}
	// Inline link styles to ensure consistent appearance across email clients.
	formated_text = inlineLinkAndUnderlineStyles(formated_text);

	// Build a new composition object that uses the updated formated_text.
	const compositionForEmail = { ...composition, result: formated_text };

	const messageId = await sendEmail(
		email_from,
		contact,
		formated_subject,
		compositionForEmail,
		ignoreSubscription,
	);

	if (!messageId.responseObject) {
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
		"Email",
		messageId.responseObject,
	);
	return ServiceResponse.success("Message sent", true, StatusCodes.OK);
}
