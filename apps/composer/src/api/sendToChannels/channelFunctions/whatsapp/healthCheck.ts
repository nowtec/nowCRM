import type { ServiceResponse, SettingCredential } from "@nowcrm/services";
import { settingCredentialsService } from "@nowcrm/services/server";
import { StatusCodes } from "http-status-codes";
import { env } from "@/common/utils/envConfig";

export async function checkWhatsAppHealth(
	credential: Omit<SettingCredential, "setting">,
): Promise<ServiceResponse<null> | ServiceResponse<string>> {
	if (!credential || !credential.access_token || !credential.client_id) {
		settingCredentialsService.update(
			credential.documentId,
			{
				credential_status: "disconnected",
				error_message: "Client id or acces token is empty",
			},
			env.COMPOSER_STRAPI_API_TOKEN,
		);
	}

	const response = await fetch(
		`https://graph.facebook.com/v22.0/${credential.client_id}?fields=id`,
		{
			method: "GET",
			headers: {
				Authorization: `Bearer ${credential.access_token}`,
				Accept: "application/json",
			},
		},
	);
	const data = await response.json();

	const serviceResponse: ServiceResponse = {
		success: !!data?.id,
		responseObject: null,
		message: data?.id ? "active" : "failed",
		statusCode: StatusCodes.OK,
	};

	if (serviceResponse.success) {
		settingCredentialsService.update(
			credential.documentId,
			{
				credential_status: "active",
				error_message: "",
			},
			env.COMPOSER_STRAPI_API_TOKEN,
		);
	} else {
		settingCredentialsService.update(
			credential.documentId,
			{
				credential_status: "invalid",
				error_message: data.error.message,
			},
			env.COMPOSER_STRAPI_API_TOKEN,
		);
	}
	return serviceResponse;
}
