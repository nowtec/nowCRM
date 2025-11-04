import { CommunicationChannel, ServiceResponse } from "@nowcrm/services";
import { settingsService } from "@nowcrm/services/server";
import { StatusCodes } from "http-status-codes";
import { env } from "@/common/utils/envConfig";
import { checkLinkedInHealth } from "./linkedIn/healthCheck";
import { checkSMSHealth } from "./sms/healthCheck";
import { checkTelegramHealth } from "./telegram/healthcheck";
import { checkTwitterHealth } from "./twitter/healthCheck";
import { checkWhatsAppHealth } from "./whatsapp/healthCheck";
import { checkWordpressHealth } from "./wordpress/healthcheck";

export async function runHealthCheck() {
	const settings = await settingsService.find(env.COMPOSER_STRAPI_API_TOKEN, {
		populate: "*",
	});

	if (!settings.success || !settings.data) {
		return ServiceResponse.failure(
			"Setting not found,probably strapi is down",
			null,
			StatusCodes.INTERNAL_SERVER_ERROR,
		);
	}

	const linkedin_credential = settings.data[0].setting_credentials.find(
		(item) =>
			item.name.toLowerCase() === CommunicationChannel.LINKEDIN.toLowerCase(),
	);
	if (linkedin_credential) await checkLinkedInHealth(linkedin_credential);

	const whatsapp_credential = settings.data[0].setting_credentials.find(
		(item) =>
			item.name.toLowerCase() === CommunicationChannel.WHATSAPP.toLowerCase(),
	);
	if (whatsapp_credential) await checkWhatsAppHealth(whatsapp_credential);

	const sms_credential = settings.data[0].setting_credentials.find(
		(item) =>
			item.name.toLowerCase() === CommunicationChannel.SMS.toLowerCase(),
	);
	if (sms_credential) await checkSMSHealth(sms_credential);

	const twitter_credential = settings.data[0].setting_credentials.find(
		(item) =>
			item.name.toLowerCase() === CommunicationChannel.TWITTER.toLowerCase(),
	);
	if (twitter_credential) await checkTwitterHealth(twitter_credential);

	const telegram_credential = settings.data[0].setting_credentials.find(
		(item) =>
			item.name.toLowerCase() === CommunicationChannel.TELEGRAM.toLowerCase(),
	);
	if (telegram_credential) await checkTelegramHealth(telegram_credential);

	const wordpress_credential = settings.data[0].setting_credentials.find(
		(item) =>
			item.name.toLowerCase() === CommunicationChannel.BLOG.toLowerCase(),
	);
	if (wordpress_credential) await checkWordpressHealth(wordpress_credential);

	return ServiceResponse.success(
		"Health check processed",
		null,
		StatusCodes.OK,
	);
}
