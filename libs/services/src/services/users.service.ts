import qs from 'qs'
import { API_ROUTES_STRAPI } from "../api-routes/api-routes-strapi";
import { StrapiQuery } from "../client";
import { envServices } from "../env-config";
import { handleError, handleResponse, type StandardResponse } from "../server";
import type { Asset } from "../types/common/asset";
import type { Form_User, strapi_user, User } from "../types/user";
import BaseService from "./common/base.service";

class UsersService extends BaseService<User, Form_User> {
	public constructor() {
		super(API_ROUTES_STRAPI.USERS);
	}
	// overriding find method because it return [] instead of data
	override async find(
		token: string,
		options?: StrapiQuery<User>,
		fetchOptions?: RequestInit & { next?: any },
	): Promise<StandardResponse<User[]>> {
		const query = qs.stringify(options, { encodeValuesOnly: true });
		const url = new URL(
			`${this.endpoint}?${query}`,
			envServices.STRAPI_URL,
		);
		try {
			const response = await fetch(url, {
				...fetchOptions,
				headers: this.getHeaders(false, token),
			});
			return await handleResponse<User[]>(response);
		} catch (error: any) {
			return handleError<User[]>(error);
		}
	}

	async uploadProfilePicture(
		files: any,
		userId: number,
		token: string,
	): Promise<StandardResponse<Asset[]>> {
		const url = new URL(
			`strapi/api/${API_ROUTES_STRAPI.UPLOAD}`,
			envServices.API_GATEWAY,
		);
		const formData = new FormData();
		for (let i = 0; i < files.length; i++) {
			formData.append("files", files[i]);
		}
		formData.append("ref", "plugin::users-permissions.user");
		formData.append("refId", userId.toString());
		formData.append("field", "image");
		try {
			//TODO: remove config service from here
			const response = await fetch(url, {
				headers: this.getHeaders(false, token),
				cache: "no-store",
				method: "POST",
				body: formData,
			});
			return await handleResponse(response);
		} catch (error: any) {
			return handleError(error);
		}
	}

	async updateProfile(
		userId: number,
		data: {
			username?: string;
			email?: string;
			is2FAEnabled?: boolean;
			totpSecret?: string | null;
		},
		token: string,
	): Promise<User> {
		// Returning the updated Strapi User object
		// Use the base path from the constructor + /:id for the specific user
		const url = new URL(
			`strapi/api/${API_ROUTES_STRAPI.USERS}/${userId}`,
			envServices.API_GATEWAY,
		); // e.g., http://host/api/users/123

		// Ensure we only proceed if there's data to update
		if (Object.keys(data).length === 0) {
			console.warn("updateProfile service called with no data.");
			throw new Error("No data provided for profile update.");
		}

		// Validate 2FA data
		if (data.is2FAEnabled === true && !data.totpSecret) {
			throw new Error("TOTP secret is required when enabling 2FA");
		}

		try {
			// Use PUT for update, assumes CRM_STRAPI_API_TOKEN grants update permission
			const response = await fetch(url, {
				method: "PUT",
				// Use getHeaders for consistency, ensure it sets JSON content type and Bearer token
				headers: this.getHeaders(true, token),
				body: JSON.stringify(data),
			});

			// Use handleResponse/handleError pattern for consistency if desired
			if (!response.ok) {
				const errorBody = await response.text();
				console.error(
					`Strapi Update Profile Service Error (${response.status}) for user ${userId}: ${errorBody}`,
				);
				throw new Error(
					`Failed to update profile via service for user ${userId}. Status: ${response.status}`,
				);
			}

			const updatedUser = await response.json();
			return updatedUser as User;
		} catch (error) {
			console.error(
				`Error in updateProfile service for user ${userId}:`,
				error,
			);
			throw error instanceof Error
				? error
				: new Error(
						"An unknown error occurred during profile update service call.",
					);
		}
	}

	async forgotPassword(
		email: string,
		token: string,
	): Promise<StandardResponse<null>> {
		const url = new URL(
			`strapi/api/${API_ROUTES_STRAPI.FORGOT_PASSWORD}`,
			envServices.API_GATEWAY,
		);

		try {
			const response = await fetch(url, {
				method: "POST",
				headers: this.getHeaders(true, token),
				body: JSON.stringify({ email }),
			});

			return await handleResponse<null>(response);
		} catch (error: any) {
			return handleError<null>(error);
		}
	}
	async resetPassword(
		code: string,
		password: string,
		passwordConfirmation: string,
		token: string,
	): Promise<StandardResponse<strapi_user>> {
		const url = new URL(
			`strapi/api/${API_ROUTES_STRAPI.RESET_PASSWORD}`,
			envServices.API_GATEWAY,
		);

		try {
			const response = await fetch(url, {
				method: "POST",
				headers: this.getHeaders(true, token),
				body: JSON.stringify({
					code,
					password,
					passwordConfirmation,
				}),
			});

			return await handleResponse(response);
		} catch (error: any) {
			return handleError(error);
		}
	}

	async authenticateCredentials(
		email: string,
		password: string,
		token: string,
	): Promise<User | null> {
		const url = new URL(
			`strapi/api/${API_ROUTES_STRAPI.AUTH_LOGIN}`,
			envServices.API_GATEWAY,
		);

		try {
			const response = await fetch(url, {
				method: "POST",
				headers: this.getHeaders(true, token),
				body: JSON.stringify({
					identifier: email,
					password: password,
				}),
			});

			const data = (await response.json()) as any;

			if (data.error) {
				// Invalid credentials or other error
				console.log("Authentication failed:", data.error.message);
				return null;
			}

			// Return the user data for 2FA checking
			return data.user;
		} catch (error) {
			console.error("Error authenticating credentials:", error);
			return null;
		}
	}

	async getById(userId: number, token: string): Promise<User | null> {
		const url = new URL(
			`strapi/api/${API_ROUTES_STRAPI.USERS}/${userId}`,
			envServices.API_GATEWAY,
		);

		try {
			const response = await fetch(url, {
				method: "GET",
				headers: this.getHeaders(false, token),
			});

			if (!response.ok) {
				if (response.status === 404) {
					return null;
				}
				throw new Error(`Failed to fetch user. Status: ${response.status}`);
			}

			const user: User = (await response.json()) as User;
			return user;
		} catch (_error) {
			return null;
		}
	}

	async register(
		userData: Partial<Form_User>,
		token: string,
	): Promise<StandardResponse<null>> {
		const url = new URL(
			`strapi/api/${API_ROUTES_STRAPI.REGISTER}`,
			envServices.API_GATEWAY,
		);
		console.log(userData);
		try {
			const response = await fetch(url, {
				method: "POST",
				headers: this.getHeaders(true, token),
				body: JSON.stringify(userData),
			});

			return await handleResponse<null>(response);
		} catch (error: any) {
			console.error("Error registering user:", error);
			return handleError<null>(error);
		}
	}
	async login(userData: {
		identifier: string;
		password: string;
		token: string;
	}): Promise<StandardResponse<strapi_user>> {
		const url = new URL(
			`strapi/api/${API_ROUTES_STRAPI.AUTH_LOGIN}`,
			envServices.API_GATEWAY,
		);

		try {
			const response = await fetch(url, {
				method: "POST",
				headers: this.getHeaders(true, userData.token),
				body: JSON.stringify(userData),
			});
			const data = (await response.json()) as any;
			if (data.error) {
				if (data.error.status === 403) {
					return {
						data: null,
						status: data.error.status,
						success: false,
						errorMessage:
							"Api token used for loggin is missing access to user-permissions table",
					};
				}
				return {
					data: null,
					status: data.error.status,
					success: false,
					errorMessage: `${data.error.message}`,
				};
			}

			await this.update(
				data.user.id,
				{ jwt_token: data.jwt },
				userData.token,
				true,
			);

			return {
				data: data,
				status: 200,
				success: true,
			};
		} catch (error: any) {
			return {
				data: null,
				status: 400,
				success: false,
				errorMessage: `Error logging in user: ${error}`,
			};
		}
	}
}

export const usersService = new UsersService();
