import { ListTopicsCommand, SNSClient } from "@aws-sdk/client-sns";
import type { ServiceResponse, SettingCredential } from "@nowcrm/services";
import { settingCredentialsService } from "@nowcrm/services/server";
import { StatusCodes } from "http-status-codes";
import { env } from "@/common/utils/envConfig";

export async function checkSMSHealth(
	credential: Omit<SettingCredential, "setting">,
): Promise<ServiceResponse<null>> {
	// Validate that the critical credentials are present.
	if (!credential || !credential.client_id || !credential.client_secret) {
		await settingCredentialsService.update(
			credential.documentId,
			{
				credential_status: "disconnected",
				error_message: "Client id or secret token is empty",
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
		const snsClient = new SNSClient({
			region: credential.organization_urn,
			credentials: {
				accessKeyId: credential.client_id,
				secretAccessKey: credential.client_secret,
			},
		});

		const command = new ListTopicsCommand({});
		await snsClient.send(command);

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
