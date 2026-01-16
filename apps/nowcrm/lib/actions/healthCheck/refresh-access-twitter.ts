// actions/deleteContactAction.ts
"use server";
import { handleError, type StandardResponse } from "@nowcrm/services/server";
import { auth } from "@/auth";
import { env } from "@/lib/config/env-config";

export async function refreshAccessTwitter(): Promise<
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
		const url = `${env.API_GATEWAY}/composer/send-to-channels/get-callback/twitter`;
		const rez = await fetch(url, {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
			},
			cache: "no-store",
		});

		console.log(rez);
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
