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
import { env } from "@/common/utils/envConfig";

dotenv.config();

export const linkedinPost = async (
	compositionItem: CompositionItem,
): Promise<ServiceResponse<boolean | null>> => {
	// 1. Fetch settings
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

	// 2. Get LinkedIn credentials
	const cred = settings.data[0].setting_credentials.find(
		(c) => c.name.toLowerCase() === CommunicationChannel.LINKEDIN.toLowerCase(),
	);
	if (!cred) {
		return ServiceResponse.failure(
			"No linkedin credentials found for your account",
			null,
			StatusCodes.INTERNAL_SERVER_ERROR,
		);
	}
	if (!cred.access_token) {
		await settingCredentialsService.update(
			cred.documentId,
			{
				credential_status: "invalid",
				error_message:
					"No linkedin access token provided, please refresh your token",
			},
			env.COMPOSER_STRAPI_API_TOKEN,
		);
		return ServiceResponse.failure(
			"No linkedin access token provided, please refresh your token",
			null,
			StatusCodes.BAD_REQUEST,
		);
	}
	if (!cred.organization_urn) {
		await settingCredentialsService.update(
			cred.documentId,
			{
				credential_status: "invalid",
				error_message: "No organization URN provided for linkedin channel",
			},
			env.COMPOSER_STRAPI_API_TOKEN,
		);
		return ServiceResponse.failure(
			"No linkedin organization urn provided, please update your credentials",
			null,
			StatusCodes.BAD_REQUEST,
		);
	}

	// 3. Prepare attachments
	const attachments =
		compositionItem.attached_files?.map((f) => ({
			filename: f.name,
			url: f.url,
		})) || [];

	// We'll store both the original asset URN and a Posts-API-compatible image URN
	const mediaAssets: Array<{
		assetUrn: string;
		imageUrn: string;
		filename: string;
	}> = [];

	try {
		// 4. Register & upload each image
		for (const { filename, url } of attachments) {
			// 4.1 Register the asset to get an upload URL & digitalmediaAsset URN
			const registerResp = await fetch(
				"https://api.linkedin.com/v2/assets?action=registerUpload",
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${cred.access_token}`,
						"Content-Type": "application/json",
						"X-Restli-Protocol-Version": "2.0.0",
					},
					body: JSON.stringify({
						registerUploadRequest: {
							recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
							owner: `urn:li:organization:${cred.organization_urn}`,
							serviceRelationships: [
								{
									relationshipType: "OWNER",
									identifier: "urn:li:userGeneratedContent",
								},
							],
						},
					}),
				},
			);
			if (!registerResp.ok) {
				const msg = `${registerResp.status} ${registerResp.statusText}`;
				await settingCredentialsService.update(
					cred.documentId,
					{
						credential_status: "invalid",
						error_message: msg,
					},
					env.COMPOSER_STRAPI_API_TOKEN,
				);
				return ServiceResponse.failure(
					`${msg} during image registration`,
					null,
					StatusCodes.BAD_REQUEST,
				);
			}
			const { value } = await registerResp.json();
			const mech =
				value.uploadMechanism[
					"com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
				];
			const uploadUrl: string = mech.uploadUrl;
			const assetUrn: string = value.asset; // e.g. "urn:li:digitalmediaAsset:C4D00AAAAbBCDEFG"

			// 4.2 Fetch the image binary
			const imgResp = await fetch(url);
			if (!imgResp.ok) {
				return ServiceResponse.failure(
					`Failed to fetch image ${filename}`,
					null,
					StatusCodes.BAD_REQUEST,
				);
			}
			const buf = Buffer.from(await imgResp.arrayBuffer());

			// 4.3 Detect MIME type
			const { fileTypeFromBuffer } =
				await loadEsm<typeof import("file-type")>("file-type");
			const typeInfo = await fileTypeFromBuffer(buf);
			const contentType = typeInfo?.mime || "image/jpeg";

			// 4.4 Upload the image binary
			const upResp = await fetch(uploadUrl, {
				method: "PUT",
				headers: { "Content-Type": contentType },
				body: buf,
			});
			if (!upResp.ok) {
				return ServiceResponse.failure(
					`Image upload failed for ${filename}`,
					null,
					StatusCodes.BAD_REQUEST,
				);
			}

			// 4.5 Derive a Posts-API-compatible image URN from the digitalmediaAsset URN
			const idPart = assetUrn.split(":").pop(); // e.g. "C4D00AAAAbBCDEFG"
			const imageUrn = `urn:li:image:${idPart}`; // e.g. "urn:li:image:C4D00AAAAbBCDEFG"

			mediaAssets.push({ assetUrn, imageUrn, filename });
		}

		// 5. Build /rest/posts payload
		const payload: any = {
			author: `urn:li:organization:${cred.organization_urn}`,
			commentary: compositionItem.result,
			visibility: "PUBLIC",
			distribution: {
				feedDistribution: "MAIN_FEED",
				targetEntities: [],
				thirdPartyDistributionChannels: [],
			},
			lifecycleState: "PUBLISHED",
			isReshareDisabledByAuthor: false,
		};

		if (mediaAssets.length === 1) {
			// Single image
			const { imageUrn, filename } = mediaAssets[0];
			payload.content = {
				media: {
					id: imageUrn,
					title: filename,
					altText: filename,
				},
			};
		} else if (mediaAssets.length > 1) {
			// Multiple images
			payload.content = {
				multiImage: {
					images: mediaAssets.map(({ imageUrn, filename }) => ({
						id: imageUrn,
						altText: filename,
					})),
				},
			};
		}

		// 6. Send to /rest/posts
		const postResp = await fetch("https://api.linkedin.com/rest/posts", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${cred.access_token}`,
				"X-Restli-Protocol-Version": "2.0.0",
				"LinkedIn-Version": process.env.LINKEDIN_API_VERSION || "202505",
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
		});

		if (!postResp.ok) {
			const msg = `${postResp.status} ${postResp.statusText}`;
			await settingCredentialsService.update(
				cred.documentId,
				{
					credential_status: "invalid",
					error_message: msg,
				},
				env.COMPOSER_STRAPI_API_TOKEN,
			);
			return ServiceResponse.failure(
				`${msg} when creating post`,
				null,
				StatusCodes.BAD_REQUEST,
			);
		}

		// 7. Reactivate credentials if needed
		if (cred.credential_status !== "active") {
			await settingCredentialsService.update(
				cred.documentId,
				{
					credential_status: "active",
					error_message: "",
				},
				env.COMPOSER_STRAPI_API_TOKEN,
			);
		}

		// 8. Mark composition as published
		await compositionItemsService.update(
			compositionItem.documentId,
			{
				item_status: "Published",
			},
			env.COMPOSER_STRAPI_API_TOKEN,
		);

		return ServiceResponse.success("Posted to LinkedIn", true, StatusCodes.OK);
	} catch (err: any) {
		return ServiceResponse.failure(
			`Unexpected error: ${err.message}`,
			null,
			StatusCodes.INTERNAL_SERVER_ERROR,
		);
	}
};
