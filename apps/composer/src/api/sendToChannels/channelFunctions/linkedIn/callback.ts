import {
	CommunicationChannel,
	ServiceResponse,
	type SettingCredential,
} from "@nowcrm/services";
import {
	settingCredentialsService,
	settingsService,
} from "@nowcrm/services/server";
import { StatusCodes } from "http-status-codes";
import { CALLBACK_URL_LINKEDIN, env } from "@/common/utils/envConfig";

export async function getLinkedInAccessToken(
	auth_code: string,
	client_id: string,
	client_secret: string,
) {
	const url = "https://www.linkedin.com/oauth/v2/accessToken";

	const params = new URLSearchParams({
		grant_type: "authorization_code",
		code: auth_code,
		client_id: client_id,
		client_secret: client_secret,
		redirect_uri: CALLBACK_URL_LINKEDIN,
	});

	const fullUrl = `${url}?${params.toString()}`;

	try {
		const response = await fetch(fullUrl, {
			method: "GET",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
		});

		const data = await response.json();

		if (response.ok) {
			return {
				access_token: data.access_token,
				refresh_token: data.refresh_token,
			};
		} else {
			console.error("Error fetching access token:", data);
			return;
		}
	} catch (error) {
		console.error("Error:", error);
		return;
	}
}

export async function refreshToken(
	linkedin_credential: Omit<SettingCredential, "setting">,
) {
	const url = "https://www.linkedin.com/oauth/v2/accessToken";

	const params = new URLSearchParams({
		grant_type: "refresh_token",
		refresh_token: linkedin_credential.refresh_token,
		client_id: linkedin_credential.client_id,
		client_secret: linkedin_credential.client_secret,
	});

	const fullUrl = `${url}?${params.toString()}`;
	try {
		const response = await fetch(fullUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
		});
		const data = await response.json();
		if (response.ok) {
			await settingCredentialsService.update(
				linkedin_credential.documentId,
				{
					access_token: data.access_token,
					refresh_token: data.refresh_token,
					credential_status: "active",
					error_message: "",
				},
				env.COMPOSER_STRAPI_API_TOKEN,
			);

			return ServiceResponse.success(
				"Refreshed token automaticly",
				null,
				StatusCodes.OK,
			);
		}
		return ServiceResponse.failure(
			`${response.status} - ${response.statusText}`,
			null,
			response.status,
		);
	} catch (error: any) {
		console.error("Error:", error);
		return ServiceResponse.failure(
			`${error.message}`,
			null,
			StatusCodes.INTERNAL_SERVER_ERROR,
		);
	}
}
export async function generateRefreshUrlLinkedIn() {
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

	const linkedin_credential = settings.data[0].setting_credentials.find(
		(item) =>
			item.name.toLowerCase() === CommunicationChannel.LINKEDIN.toLowerCase(),
	);

	if (!linkedin_credential) {
		return ServiceResponse.failure(
			"No linkedin credentials found for your account",
			null,
			StatusCodes.INTERNAL_SERVER_ERROR,
		);
	}

	if (linkedin_credential.refresh_token) {
		return await refreshToken(linkedin_credential);
	}
	return ServiceResponse.success(
		"Generated link for refreshing access token",
		`https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${linkedin_credential.client_id}&redirect_uri=${CALLBACK_URL_LINKEDIN}&state=foobar&scope=w_organization_social%20r_organization_social`,
		StatusCodes.OK,
	);
}
