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
import { loadEsm } from "load-esm";
import { env, TELEGRAM_API_BASE } from "@/common/utils/envConfig";

dotenv.config();

export const telegramPost = async (
	compositionItem: CompositionItem,
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

	const telegram_credential = settings.data[0].setting_credentials.find(
		(item) =>
			item.name.toLowerCase() === CommunicationChannel.TELEGRAM.toLowerCase(),
	);
	if (!telegram_credential) {
		return ServiceResponse.failure(
			"No telegram credentials found for your account",
			null,
			StatusCodes.INTERNAL_SERVER_ERROR,
		);
	}
	if (!telegram_credential.access_token) {
		await settingCredentialsService.update(
			telegram_credential.documentId,
			{
				credential_status: "invalid",
				error_message:
					"No telegram API token provided, please update your token",
			},
			env.COMPOSER_STRAPI_API_TOKEN,
		);
		return ServiceResponse.failure(
			"No telegram api provided, please refresh your token",
			null,
			StatusCodes.BAD_REQUEST,
		);
	}
	if (!telegram_credential.organization_urn) {
		await settingCredentialsService.update(
			telegram_credential.documentId,
			{
				credential_status: "invalid",
				error_message: "No channel id provided for telegram channel",
			},
			env.COMPOSER_STRAPI_API_TOKEN,
		);
		return ServiceResponse.failure(
			"No channel id provided for telegram channel, please update your credentials",
			null,
			StatusCodes.BAD_REQUEST,
		);
	}

	// Map attached files from the composition item
	const attachments =
		compositionItem.attached_files?.map((file) => ({
			filename: file.name,
			path: file.url,
		})) || [];

	const botToken = telegram_credential.access_token;
	const chatId = telegram_credential.organization_urn;

	try {
		// Handle attachments if available
		if (attachments.length > 0) {
			for (let i = 0; i < attachments.length; i++) {
				const { filename, path } = attachments[i];
				// 1. Fetch the file buffer
				const fileResp = await fetch(path);
				if (!fileResp.ok) {
					return ServiceResponse.failure(
						`Failed to fetch file ${filename}`,
						null,
						StatusCodes.BAD_REQUEST,
					);
				}
				const arrayBuffer = await fileResp.arrayBuffer();
				const fileBuffer = Buffer.from(arrayBuffer);

				// 2. Detect MIME type
				let mimeType = "application/octet-stream";
				try {
					const { fileTypeFromBuffer } =
						await loadEsm<typeof import("file-type")>("file-type");
					const typeResult = await fileTypeFromBuffer(fileBuffer);
					mimeType = typeResult?.mime || mimeType;
				} catch (err) {
					console.error("File type detection error:", err);
				}
				const isImage = mimeType.startsWith("image/");
				const endpoint = isImage ? "sendPhoto" : "sendDocument";

				// 3. Build the payload
				const payload: any = {
					chat_id: chatId,
					[isImage ? "photo" : "document"]: path,
					parse_mode: "Markdown",
				};
				// Only include caption on first attachment
				if (i === 0) {
					payload.caption = compositionItem.result;
				}

				// 4. Send the file to Telegram
				const url = `${TELEGRAM_API_BASE}/bot${botToken}/${endpoint}`;
				const res = await fetch(url, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(payload),
				});
				if (!res.ok) {
					await settingCredentialsService.update(
						telegram_credential.documentId,
						{
							credential_status: "invalid",
							error_message: `${res.status} - ${res.statusText}`,
						},
						env.COMPOSER_STRAPI_API_TOKEN,
					);
					return ServiceResponse.failure(
						`${res.status} - ${res.statusText}`,
						null,
						StatusCodes.BAD_REQUEST,
					);
				}
			}
		} else {
			// No attachments: send text message only
			const url = `${TELEGRAM_API_BASE}/bot${botToken}/sendMessage`;
			const response = await fetch(url, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					chat_id: chatId,
					text: compositionItem.result,
					parse_mode: "Markdown",
				}),
			});
			if (!response.ok) {
				await settingCredentialsService.update(
					telegram_credential.documentId,
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
		}

		// Update credential status if needed
		if (telegram_credential.credential_status !== "active") {
			await settingCredentialsService.update(
				telegram_credential.documentId,
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
		return ServiceResponse.success("Posted to Telegram", true, StatusCodes.OK);
	} catch (error: any) {
		return ServiceResponse.failure(
			`Unexpected error happened: ${error.message} - ${error.status}`,
			null,
			StatusCodes.INTERNAL_SERVER_ERROR,
		);
	}
};
