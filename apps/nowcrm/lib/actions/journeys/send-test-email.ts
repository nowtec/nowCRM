"use server";

import type { StandardResponse } from "@nowcrm/services";
import type { DocumentId, sendToChannelsData } from "@nowcrm/services/client";
import {
	composerService,
	compositionsService,
	handleError,
} from "@nowcrm/services/server";
import { auth } from "@/auth";

export async function sendTestEmailAction(
	compositionId: DocumentId,
	email: string,
	channel: string,
	subject?: string,
	from?: string,
): Promise<StandardResponse<null>> {
	const session = await auth();
	if (!session || !session.jwt) {
		return {
			data: null,
			status: 403,
			success: false,
			errorMessage: "Unauthorized",
		};
	}

	try {
		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return {
				data: null,
				status: 400,
				success: false,
				errorMessage: "Invalid email address",
			};
		}

		// Fetch composition to get subject if not provided
		let finalSubject = subject;
		const finalFrom = from;

		if (!finalSubject) {
			const compositionResult = await compositionsService.findOne(
				compositionId,
				session.jwt,
			);

			if (compositionResult.success && compositionResult.data) {
				finalSubject = compositionResult.data.subject || "";
			}
		}

		// If subject is still empty, use a default
		if (!finalSubject) {
			finalSubject = "Test Email";
		}

		const payload: sendToChannelsData = {
			composition_id: compositionId,
			channels: [channel.toLowerCase()],
			to: email,
			type: "contact",
			subject: finalSubject,
			from: finalFrom || "",
			ignoreSubscription: true, // Allow sending test emails even if subscription is required
			interval: 0,
		};

		const response = await composerService.sendComposition(
			payload,
			session.jwt,
		);
		return response;
	} catch (error: any) {
		return handleError(error);
	}
}
