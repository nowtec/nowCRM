import { CommunicationChannel, ServiceResponse } from "@nowcrm/services";
import {
	settingCredentialsService,
	settingsService,
} from "@nowcrm/services/server";
import { StatusCodes } from "http-status-codes";
import { type PostHostedAuthLinkInput, UnipileClient } from "unipile-node-sdk";
import { CALLBACK_URL_UNIPILE, env } from "@/common/utils/envConfig";
import { logger } from "@/logger";
export async function generateAccessURLUnipile(
	name: string,
	reconnect_account?: string,
) {
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

	if (settings.data[0].setting_credentials.length === 0) {
		return ServiceResponse.failure(
			"Strapi token badly configured for Composer service",
			null,
			StatusCodes.PARTIAL_CONTENT,
		);
	}

	const uniple_credentials = settings.data[0].setting_credentials.find(
		(item) =>
			item.name.toLowerCase() ===
			CommunicationChannel.UNIPILE.toLocaleLowerCase(),
	);

	if (!uniple_credentials) {
		return ServiceResponse.failure(
			"No unipile credentials found for your account",
			null,
			StatusCodes.INTERNAL_SERVER_ERROR,
		);
	}

	if (!uniple_credentials.client_id || !uniple_credentials.client_secret) {
		settingCredentialsService.update(
			uniple_credentials.documentId,
			{
				credential_status: "invalid",
				error_message: "Api token and DNS is not provided",
			},
			env.COMPOSER_STRAPI_API_TOKEN,
		);
		return ServiceResponse.failure(
			"No Unipile credentials found for your account",
			null,
			StatusCodes.INTERNAL_SERVER_ERROR,
		);
	}

	// we assume that client id is DSN and client secret is API token
	const client = new UnipileClient(
		`https://${uniple_credentials.client_id}`,
		`${uniple_credentials.client_secret}`,
	);

	const payload: PostHostedAuthLinkInput = reconnect_account
		? {
				type: "reconnect",
				expiresOn: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
				api_url: `https://${uniple_credentials.client_id}`,
				reconnect_account,
				success_redirect_url: env.COMPOSER_CRM_REDIRECT_HEALTH_CHECK,
				failure_redirect_url: env.COMPOSER_CRM_REDIRECT_HEALTH_CHECK,
				notify_url: CALLBACK_URL_UNIPILE,
				name,
			}
		: {
				type: "create",
				expiresOn: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
				api_url: `https://${uniple_credentials.client_id}`,
				providers: ["LINKEDIN"],
				success_redirect_url: env.COMPOSER_CRM_REDIRECT_HEALTH_CHECK,
				failure_redirect_url: env.COMPOSER_CRM_REDIRECT_HEALTH_CHECK,
				notify_url: CALLBACK_URL_UNIPILE,
				name,
			};

	logger.info(
		JSON.stringify({
			message: "Generating Unipile access URL",
			notify_url: payload.notify_url,
			type: payload.type,
			name: payload.name,
			api_url: payload.api_url,
			reconnect_account: reconnect_account,
		}),
	);
	const link = await client.account.createHostedAuthLink(payload);

	return ServiceResponse.success(
		"Generated link for refreshing access token",
		link.url,
		StatusCodes.OK,
	);
}
