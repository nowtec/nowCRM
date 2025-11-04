import type { ServiceResponse, SettingCredential } from "@nowcrm/services";
import { settingCredentialsService } from "@nowcrm/services/server";
import { StatusCodes } from "http-status-codes";
import { env, TELEGRAM_API_BASE } from "@/common/utils/envConfig";

export async function checkTelegramHealth(
	credential: Omit<SettingCredential, "setting">,
): Promise<ServiceResponse<null>> {
	// Validate that the critical credentials are present.
	if (!credential || !credential.access_token) {
		await settingCredentialsService.update(
			credential.documentId,
			{
				credential_status: "disconnected",
				error_message: "Api token is empty",
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
		const url = `${TELEGRAM_API_BASE}/bot${credential.access_token}/getMe`;

		const resp = await fetch(url, {
			method: "GET",
		});
		if (resp.ok === true) {
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

		return {
			success: false,
			responseObject: null,
			message: "failed",
			statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
		};
	} catch (error: any) {
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
