"use server";

import { cookies } from "next/headers";
import { signIn } from "@/auth";

import { RouteConfig } from "@/lib/config/RoutesConfig";
import { usersService } from "@nowcrm/services/server";
import { env } from "@/lib/config/envConfig";


export async function onSubmitLogin(values: {
	password: string;
	email: string;
}) {
	try {
		// First, check if user exists and verify password
		const user = await usersService.authenticateCredentials(
			values.email,
			values.password,
			env.CRM_STRAPI_API_TOKEN,
		);

		if (!user) {
			return { error: "Invalid email or password" };
		}

		// Check if user has 2FA enabled
		if (user.is2FAEnabled && user.totpSecret) {
			// Store pending login state for second factor verification
			const cookieStore = await cookies();

			cookieStore.set("pendingLoginUserId", user.id.toString(), {
				httpOnly: true,
				secure: process.env.NODE_ENV === "production",
				sameSite: "lax",
				maxAge: 60 * 10, // 10 minutes
			});

			cookieStore.set("pendingLoginEmail", values.email, {
				httpOnly: true,
				secure: process.env.NODE_ENV === "production",
				sameSite: "lax",
				maxAge: 60 * 10, // 10 minutes
			});

			// Redirect to 2FA verification
			return { success: false, redirectTo: RouteConfig.auth.verify_otp };
		} else {
			// No 2FA - proceed with normal NextAuth sign in
			console.log("No 2fa");
			await signIn("credentials", {
				...values,
				redirect: false,
			});
			return { success: true, redirectTo: RouteConfig.home };
		}
	} catch (error: any) {
		console.error("Login error:", error);
		return {
			error: error.cause?.err?.message || error.message || "Login failed",
		};
	}
}

/**
 * Complete login after 2FA verification
 * This is called from the verify-otp page after successful TOTP verification
 */
export async function completeLoginAfter2FA(userId: number) {
	try {
		const cookieStore = await cookies();
		const pendingEmail = cookieStore.get("pendingLoginEmail")?.value;

		console.log("Completing 2FA login for:", { pendingEmail, userId });

		if (!pendingEmail) {
			throw new Error("No pending login found");
		}

		// Get user data to complete the sign in
		const user = await usersService.getById(userId, env.CRM_STRAPI_API_TOKEN);

		if (!user) {
			throw new Error("User not found");
		}

		// Complete the NextAuth sign in
		await signIn("credentials", {
			email: pendingEmail,
			password: "__2fa-token-auth__",
			redirect: false,
		});

		// Clear pending login cookies
		cookieStore.delete("pendingLoginUserId");
		cookieStore.delete("pendingLoginEmail");

		return { success: true, redirectTo: RouteConfig.home };
	} catch (error: any) {
		console.error("Complete login error:", error);
		throw new Error("Failed to complete login after 2FA verification");
	}
}
