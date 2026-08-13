// actions/deleteContactAction.ts
"use server";
import { handleError, type StandardResponse } from "@nowcrm/services/server";
import { auth } from "@/auth";
import { env } from "@/lib/config/env-config";

export async function refreshAccessLinkedin(): Promise<
	StandardResponse<string>
> {
	const session = await auth();
	if (!session) {
		return {
			data: null,
			status: 403,
			success: false,
		};
	}
	try {
		const url = new URL(
			"/composer/send-to-channels/get-callback/linkedin",
			env.API_GATEWAY,
		);
		const rez = await fetch(url, {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${session.jwt}`,
			},
			cache: "no-store",
		});
		const response = await rez.json();
		return {
			data: response.responseObject,
			status: 200,
			success: true,
		};
	} catch (error: any) {
		return handleError(error);
	}
}
