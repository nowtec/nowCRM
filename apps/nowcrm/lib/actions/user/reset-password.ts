"use server";

import { env } from "@/lib/config/envConfig";
import { usersService } from "@nowcrm/services/server";

type ResetPasswordValues = {
	code: string;
	password: string;
	passwordConfirmation: string;
};

export async function onSubmitResetPassword(values: ResetPasswordValues) {
	try {
		const result = await usersService.resetPassword(
			values.code,
			values.password,
			values.passwordConfirmation,
			env.CRM_STRAPI_API_TOKEN,
		);

		if (!result.success) {
			return {
				error: result.errorMessage || "Failed to reset password",
			};
		}

		return {
			success: true,
			user: result.data,
		};
	} catch (error: any) {
		console.error("Reset password error:", error);
		return {
			error: error.message || "An unexpected error occurred",
		};
	}
}
