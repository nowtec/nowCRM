import type { ServiceResponse, SettingCredential } from "@nowcrm/services";
import { settingCredentialsService } from "@nowcrm/services/server";
import { StatusCodes } from "http-status-codes";
import { env } from "@/common/utils/envConfig";

export async function checkWordpressHealth(
	credential: Omit<SettingCredential, "setting">,
): Promise<ServiceResponse<null>> {
	// Validate that the critical credentials are present.
	if (!credential || !credential.wp_url) {
		await settingCredentialsService.update(
			credential.documentId,
			{
				credential_status: "disconnected",
				error_message: "No wp url provided",
			},
			env.COMPOSER_STRAPI_API_TOKEN,
		);
		return {
			success: false,
			responseObject: null,
			message: "disconnected",
			statusCode: StatusCodes.BAD_REQUEST,
		};
	}
	if (!credential.client_id || !credential.client_secret) {
		await settingCredentialsService.update(
			credential.documentId,
			{
				credential_status: "disconnected",
				error_message: "Credentials are empty",
			},
			env.COMPOSER_STRAPI_API_TOKEN,
		);
		return {
			success: false,
			responseObject: null,
			message: "disconnected",
			statusCode: StatusCodes.BAD_REQUEST,
		};
	}

	try {
		const auth = Buffer.from(
			`${credential.client_id}:${credential.client_secret}`,
		).toString("base64");

		const requestUrl = `${credential.wp_url}wp-json/wp/v2/users/me`;

		const response = await fetch(requestUrl, {
			method: "GET",
			headers: {
				Authorization: `Basic ${auth}`,
				Accept: "application/json",
			},
		});

		if (response.ok === true) {
			await settingCredentialsService.update(
				credential.documentId,
				{
					credential_status: "active",
					error_message: "",
				},
				env.COMPOSER_STRAPI_API_TOKEN,
			);
			return {
				success: true,
				responseObject: null,
				message: "active",
				statusCode: StatusCodes.OK,
			};
		}

		const data = await response.json();
		console.log(data);

		await settingCredentialsService.update(
			credential.documentId,
			{
				credential_status: "invalid",
				error_message: `${data.error} - ${data.error_description}`,
			},
			env.COMPOSER_STRAPI_API_TOKEN,
		);

		return {
			success: false,
			responseObject: null,
			message: "failed",
			statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
		};
	} catch (error: any) {
		console.log("lol");
		console.log(error);
		await settingCredentialsService.update(
			credential.documentId,
			{
				credential_status: "invalid",
				error_message: error.message || "Unknown error",
			},
			env.COMPOSER_STRAPI_API_TOKEN,
		);

		return {
			success: false,
			responseObject: null,
			message: "failed",
			statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
		};
	}
}
