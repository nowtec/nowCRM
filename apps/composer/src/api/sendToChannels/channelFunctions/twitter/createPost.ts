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
import { TwitterApi } from "twitter-api-v2";
import { env } from "@/common/utils/envConfig";
import { refreshToken } from "./callback";

dotenv.config();

export const twitterPost = async (
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
	const twitter_credential = settings.data[0].setting_credentials.find(
		(item) =>
			item.name.toLowerCase() === CommunicationChannel.TWITTER.toLowerCase(),
	);
	if (!twitter_credential) {
		return ServiceResponse.failure(
			"No Twitter credentials found for your account",
			null,
			StatusCodes.INTERNAL_SERVER_ERROR,
		);
	}
	if (!twitter_credential.client_id && !twitter_credential.client_secret) {
		await settingCredentialsService.update(
			twitter_credential.documentId,
			{
				credential_status: "invalid",
				error_message:
					"No Twitter access token provided, please refresh your token",
			},
			env.COMPOSER_STRAPI_API_TOKEN,
		);
		return ServiceResponse.failure(
			"No Twitter access token provided, please refresh your token",
			null,
			StatusCodes.BAD_REQUEST,
		);
	}

	if (!twitter_credential.refresh_token) {
		await settingCredentialsService.update(
			twitter_credential.documentId,
			{
				credential_status: "invalid",
				error_message: "No refresh token generated for Twitter channel",
			},
			env.COMPOSER_STRAPI_API_TOKEN,
		);
		return ServiceResponse.failure(
			"No Twitter refresh token provided, please update your credentials",
			null,
			StatusCodes.BAD_REQUEST,
		);
	}

	await refreshToken(twitter_credential);
	const updated_creds = await settingCredentialsService.findOne(
		twitter_credential.documentId,
		env.COMPOSER_STRAPI_API_TOKEN,
	);
	if (!updated_creds.success || !updated_creds.data) {
		return ServiceResponse.failure(
			"Upaded creds are not available probably strapi is down",
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

	try {
		const client = new TwitterApi(updated_creds.data.access_token);

		// Array to store media IDs after upload
		const mediaIds: string[] = [];

		// Process media attachments if any
		if (attachments.length > 0) {
			for (const attachment of attachments) {
				try {
					// Fetch the media file from the URL
					const mediaResponse = await fetch(attachment.path);
					if (!mediaResponse.ok) {
						return ServiceResponse.failure(
							`Failed to fetch media file ${attachment.filename}`,
							null,
							StatusCodes.BAD_REQUEST,
						);
					}

					const mediaArrayBuffer = await mediaResponse.arrayBuffer();
					const mediaBuffer = Buffer.from(mediaArrayBuffer);

					if (
						!twitter_credential.twitter_app_key ||
						!twitter_credential.twitter_app_secret ||
						!twitter_credential.twitter_access_secret ||
						!twitter_credential.twitter_access_token
					) {
						settingCredentialsService.update(
							twitter_credential.documentId,
							{
								credential_status: "invalid",
								error_message:
									"If you want to upload imagese please update credentials for uploading images",
							},
							env.COMPOSER_STRAPI_API_TOKEN,
						);
						return ServiceResponse.failure(
							"Twitter credentials for file upload is missing",
							null,
							StatusCodes.BAD_REQUEST,
						);
					}
					const media_client = new TwitterApi({
						appKey: twitter_credential.twitter_app_key,
						appSecret: twitter_credential.twitter_app_secret,
						accessToken: twitter_credential.twitter_access_token,
						accessSecret: twitter_credential.twitter_access_secret,
					});

					// Upload media to Twitter
					const mediaId = await media_client.v1.uploadMedia(mediaBuffer, {
						mimeType: mediaResponse.headers.get("content-type") || undefined,
					});

					mediaIds.push(mediaId);
				} catch (error: any) {
					console.error(`Error uploading media ${attachment.filename}:`, error);
					return ServiceResponse.failure(
						`Failed to upload media: ${error.message}`,
						null,
						StatusCodes.BAD_REQUEST,
					);
				}
			}
		}

		// Create tweet with text and media (if available)
		const tweetOptions: any = {
			text: compositionItem.result,
		};

		// Add media IDs if available
		if (mediaIds.length > 0) {
			tweetOptions.media = { media_ids: mediaIds };
		}

		// Post the tweet
		const tweet = await client.v2.tweet(tweetOptions);

		if (tweet.errors) {
			// Update credentials on failure
			await settingCredentialsService.update(
				twitter_credential.documentId,
				{
					credential_status: "invalid",
					error_message: `${tweet.errors}`,
				},
				env.COMPOSER_STRAPI_API_TOKEN,
			);

			return ServiceResponse.failure(
				`${tweet.errors}. Please check channel status.`,
				null,
				StatusCodes.BAD_REQUEST,
			);
		}

		// Update Twitter credentials status if needed
		if (twitter_credential.credential_status !== "active") {
			await settingCredentialsService.update(
				twitter_credential.documentId,
				{
					credential_status: "active",
					error_message: "",
				},
				env.COMPOSER_STRAPI_API_TOKEN,
			);
		}

		// Update composition item status
		await compositionItemsService.update(
			compositionItem.documentId,
			{
				item_status: "Published",
			},
			env.COMPOSER_STRAPI_API_TOKEN,
		);

		return ServiceResponse.success("Posted to Twitter", true, StatusCodes.OK);
	} catch (error: any) {
		console.log(error);
		return ServiceResponse.failure(
			`Unexpected error happened: ${error.message} - ${error.status}`,
			null,
			StatusCodes.INTERNAL_SERVER_ERROR,
		);
	}
};
