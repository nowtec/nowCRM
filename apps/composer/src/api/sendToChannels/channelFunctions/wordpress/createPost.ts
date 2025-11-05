import {
	CommunicationChannel,
	type CompositionItem,
	ServiceResponse,
} from "@nowcrm/services";
import {
	compositionItemsService,
	settingCredentialsService,
	settingsService,
} from "@nowcrm/services/server";
import * as dotenv from "dotenv";
import { StatusCodes } from "http-status-codes";
import { env } from "@/common/utils/envConfig";

dotenv.config();

export const wordpressPost = async (
	compositionItem: CompositionItem,
	title: string,
): Promise<ServiceResponse<boolean | null>> => {
	// Fetch settings
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

	if (settings.data[0].setting_credentials.length === 0) {
		return ServiceResponse.failure(
			"Strapi token badly configured for Composer service",
			null,
			StatusCodes.PARTIAL_CONTENT,
		);
	}

	const wordpress_credential = settings.data[0].setting_credentials.find(
		(item) =>
			item.name.toLowerCase() === CommunicationChannel.BLOG.toLowerCase(),
	);
	if (!wordpress_credential) {
		return ServiceResponse.failure(
			"No wordpress credentials found for your account",
			null,
			StatusCodes.INTERNAL_SERVER_ERROR,
		);
	}
	if (!wordpress_credential.client_id || !wordpress_credential.client_secret) {
		await settingCredentialsService.update(
			wordpress_credential.documentId,
			{
				credential_status: "invalid",
				error_message: "No wordpress credentials provided",
			},
			env.COMPOSER_STRAPI_API_TOKEN,
		);
		return ServiceResponse.failure(
			"No worpdress credentials provided, please update you name and password",
			null,
			StatusCodes.BAD_REQUEST,
		);
	}
	if (!wordpress_credential.wp_url) {
		await settingCredentialsService.update(
			wordpress_credential.documentId,
			{
				credential_status: "invalid",
				error_message: "No wordpress url provided",
			},
			env.COMPOSER_STRAPI_API_TOKEN,
		);
		return ServiceResponse.failure(
			"No wordpress url provided, please update your credentials",
			null,
			StatusCodes.BAD_REQUEST,
		);
	}

	// Map attached files from the composition item
	const _attachments =
		compositionItem.attached_files?.map((file) => ({
			filename: file.name,
			path: file.url,
		})) || [];

	try {
		// No attachments: send text message only
		const credentials = Buffer.from(
			`${wordpress_credential.client_id}:${wordpress_credential.client_secret}`,
		).toString("base64");
		const headers = {
			"Content-Type": "application/json",
			Authorization: `Basic ${credentials}`,
		};
		const body = JSON.stringify({
			title,
			content: compositionItem.result,
			status: "publish",
		});

		// Send the POST request to WordPress API
		const response = await fetch(
			`${wordpress_credential.wp_url}wp-json/wp/v2/posts`,
			{
				method: "POST",
				headers,
				body,
			},
		);
		console.log(response);
		if (!response.ok) {
			await settingCredentialsService.update(
				wordpress_credential.documentId,
				{
					credential_status: "invalid",
					error_message: `${response.status} - ${response.statusText}`,
				},
				env.COMPOSER_STRAPI_API_TOKEN,
			);
			return ServiceResponse.failure(
				`${response.status} - ${response.statusText}`,
				null,
				StatusCodes.BAD_REQUEST,
			);
		}

		// Update credential status if needed
		if (wordpress_credential.credential_status !== "active") {
			await settingCredentialsService.update(
				wordpress_credential.documentId,
				{
					credential_status: "active",
					error_message: "",
				},
				env.COMPOSER_STRAPI_API_TOKEN,
			);
		}

		// Mark composition item as published
		await compositionItemsService.update(
			compositionItem.documentId,
			{
				item_status: "Published",
			},
			env.COMPOSER_STRAPI_API_TOKEN,
		);
		return ServiceResponse.success("Posted to Wordpress", true, StatusCodes.OK);
	} catch (error: any) {
		console.log(error);
		return ServiceResponse.failure(
			`Unexpected error happened: ${error.message} - ${error.status}`,
			null,
			StatusCodes.INTERNAL_SERVER_ERROR,
		);
	}
};
