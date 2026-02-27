// actions/deleteContactAction.ts
"use server";
import type { StandardResponse } from "@nowcrm/services";
import type { sendToChannelsData } from "@nowcrm/services/client";
import { composerService, handleError } from "@nowcrm/services/server";
import { auth } from "@/auth";

export async function sendToChannelAction(
	data: sendToChannelsData,
): Promise<StandardResponse<{ result: string }>> {
	const session = await auth();
	if (!session) {
		return {
			data: null,
			status: 403,
			success: false,
		};
	}

	try {
		console.info("[sendToChannelAction] Sending composition to composer", {
			composition_id: data.composition_id,
			channels: data.channels,
			type: data.type,
			toType: Array.isArray(data.to) ? "array" : typeof data.to,
			toCount: Array.isArray(data.to) ? data.to.length : undefined,
			toPreview:
				typeof data.to === "string" || typeof data.to === "number"
					? data.to
					: undefined,
			hasUnipileAccount: !!data.account,
			unipileAccountId: data.account?.account_id,
			interval: data.interval,
			throttle: data.throttle,
		});
		const response = await composerService.sendComposition(data);
		console.info("[sendToChannelAction] Composer response", response);
		return response;
	} catch (_error: any) {
		console.error("[sendToChannelAction] Failed to send composition", {
			error: _error?.message || String(_error),
			stack: _error?.stack,
		});
		return handleError(_error);
	}
}
