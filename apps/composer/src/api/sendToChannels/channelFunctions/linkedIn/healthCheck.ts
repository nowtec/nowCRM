import type { ServiceResponse, SettingCredential } from "@nowcrm/services";
import { settingCredentialsService } from "@nowcrm/services/server";
import { env } from "@/common/utils/envConfig";
import { refreshToken } from "./callback";

export async function checkLinkedInHealth(
	credential: Omit<SettingCredential, "setting">,
): Promise<ServiceResponse<null> | ServiceResponse<string>> {
	if (!credential || !credential.client_id || !credential.client_secret) {
		settingCredentialsService.update(
			credential.documentId,
			{
				credential_status: "disconnected",
				error_message: "Client id or client secret is empty",
			},
			env.COMPOSER_STRAPI_API_TOKEN,
		);
	}

	if (!credential.access_token) {
		settingCredentialsService.update(
			credential.documentId,
			{
				credential_status: "disconnected",
				error_message: "Acess token is empty.Please refresh access token",
			},
			env.COMPOSER_STRAPI_API_TOKEN,
		);
	}

	const serviceResponse = await refreshToken(credential);

	if (serviceResponse.success) {
		settingCredentialsService.update(
			credential.documentId,
			{
				credential_status: "active",
				error_message: "",
			},
			env.COMPOSER_STRAPI_API_TOKEN,
		);
	}
	return serviceResponse;
}
