// contactsapp/app/[locale]/(auth)/auth/verify-otp/components/verifyOtpAction.tsx

"use server";

import { cookies } from "next/headers";
import { verifyTotpToken } from "@/lib/actions/profile/edit-profile";
import { decryptTotpSecret } from "@/lib/actions/profile/encryption-helpers";

import { completeLoginAfter2FA } from "@/lib/actions/user/sign-in-action";
import { RouteConfig } from "@/lib/config/RoutesConfig";
import userService from "@/lib/services/new_type/users.service"; // Adjust path if needed

interface VerifyOtpData {
	otp: string;
}

export async function verifyOtpAction(data: VerifyOtpData) {
	try {
		const { otp } = data;

		// Get pending login data from cookies
		const cookieStore = await cookies();
		const pendingUserIdCookie = cookieStore.get("pendingLoginUserId");

		if (!pendingUserIdCookie?.value) {
			throw new Error(
				"No pending login found. Please start the login process again.",
			);
		}

		const userId = Number.parseInt(pendingUserIdCookie.value);

		// Get user data to verify 2FA
		const user = await userService.getById(userId);

		if (!user) {
			throw new Error("User not found");
		}

		if (!user.is2FAEnabled || !user.totpSecret) {
			throw new Error(
				"Two-factor authentication is not enabled for this account",
			);
		}

		// Decrypt the stored TOTP secret
		const decryptedSecret = decryptTotpSecret(user.totpSecret);

		// Verify the TOTP code (second factor)
		const isValidCode = await verifyTotpToken(decryptedSecret, otp);

		if (!isValidCode) {
			throw new Error(
				"Invalid verification code. Please check your authenticator app and try again.",
			);
		}

		// Second factor verified successfully - complete the login with NextAuth
		await completeLoginAfter2FA(userId);

		// Redirect to dashboard
		return { success: false, redirectTo: RouteConfig.home };
	} catch (error) {
		console.error("Second Factor Verification Error:", error);
		throw error instanceof Error ? error : new Error("Verification failed");
	}
}
