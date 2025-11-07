// contactsapp/lib/actions/user/forgotPasswordAction.ts
"use server";

import { env } from "@/lib/config/envConfig";
import { usersService } from "@nowcrm/services/server";


type ForgotPasswordValues = {
	email: string;
};

export async function onSubmitForgotPassword(values: ForgotPasswordValues) {
	try {
		const result = await usersService.forgotPassword(values.email,env.CRM_STRAPI_API_TOKEN);

		if (!result.success) {
			return {
				error: result.errorMessage || "Failed to send reset password email",
			};
		}

		return { success: true };
	} catch (error: any) {
		return {
			error: error.message || "An unexpected error occurred",
		};
	}
}
