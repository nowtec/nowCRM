"use server";

import { usersService } from "@nowcrm/services/server";
import { cookies } from "next/headers";
import { signIn } from "@/auth";
import { env } from "@/lib/config/envConfig";
import { RouteConfig } from "@/lib/config/RoutesConfig";

export async function onSubmitLogin(values: {
	password: string;
	email: string;
}) {
	try {
		console.log("Login attempt:", {
			email: values.email,
			hasPassword: Boolean(values.password),
		});

		console.log("Calling authenticateCredentials...");
		const user = await usersService.authenticateCredentials(
			values.email,
			values.password,
			env.CRM_STRAPI_API_TOKEN,
		);

		console.log("authenticateCredentials response:", user);

		if (!user) {
			console.log("User not found or wrong password");
			return { error: "Invalid email or password" };
		}

		console.log("User found:", {
			id: user.id,
			email: user.email,
			is2FAEnabled: user.is2FAEnabled,
			hasTotpSecret: Boolean(user.totpSecret),
		});

		if (user.is2FAEnabled && user.totpSecret) {
			console.log("2FA required for user:", user.id);

			const cookieStore = await cookies();

			cookieStore.set("pendingLoginUserId", user.id.toString(), {
				httpOnly: true,
				secure: process.env.NODE_ENV === "production",
				sameSite: "lax",
				maxAge: 60 * 10,
			});

			cookieStore.set("pendingLoginEmail", values.email, {
				httpOnly: true,
				secure: process.env.NODE_ENV === "production",
				sameSite: "lax",
				maxAge: 60 * 10,
			});

			console.log("Pending login cookies set");

			return { success: false, redirectTo: RouteConfig.auth.verify_otp };
		} else {
			console.log("2FA not enabled. Proceeding with NextAuth login");

			const nextAuthResult = await signIn("credentials", {
				...values,
				redirect: false,
			});

			console.log("NextAuth signIn result:", nextAuthResult);

			return { success: true, redirectTo: RouteConfig.home };
		}
	} catch (error: any) {
		console.error("Login error:", error);
		return {
			error: error.cause?.err?.message || error.message || "Login failed",
		};
	}
}

export async function completeLoginAfter2FA(userId: number) {
	try {
		const cookieStore = await cookies();
		const pendingEmail = cookieStore.get("pendingLoginEmail")?.value;

		console.log("Completing 2FA login:", { pendingEmail, userId });

		if (!pendingEmail) {
			console.log("Pending email not found");
			throw new Error("No pending login found");
		}

		console.log("Fetching user by id:", userId);
		const user = await usersService.getById(userId, env.CRM_STRAPI_API_TOKEN);

		console.log("Received user:", user);

		if (!user) {
			console.log("User not found for 2FA completion");
			throw new Error("User not found");
		}

		console.log("Calling NextAuth signIn for 2FA finalization");
		const finalSignInRes = await signIn("credentials", {
			email: pendingEmail,
			password: "__2fa-token-auth__",
			redirect: false,
		});

		console.log("2FA final signIn result:", finalSignInRes);

		cookieStore.delete("pendingLoginUserId");
		cookieStore.delete("pendingLoginEmail");
		console.log("Pending cookies cleared");

		return { success: true, redirectTo: RouteConfig.home };
	} catch (error: any) {
		console.error("Complete login error:", error);
		throw new Error("Failed to complete login after 2FA verification");
	}
}
