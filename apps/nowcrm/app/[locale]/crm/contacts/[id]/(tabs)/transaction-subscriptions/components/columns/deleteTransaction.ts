// actions/deleteContactAction.ts
"use server";

import { auth } from "@/auth";
import { DocumentId } from "@nowcrm/services";
import { handleError, StandardResponse } from "@nowcrm/services/server";
import { donationSubscriptionsService } from "@nowcrm/services/server";

export async function deleteDonationSubscriptionAction(
	transaction: DocumentId,
): Promise<StandardResponse<null>> {
	const session = await auth();
	if (!session) {
		return {
			data: null,
			status: 403,
			success: false,
		};
	}
	try {
		const response = await donationSubscriptionsService.delete(transaction, session.jwt);
		return response;
	} catch (error) {
		return handleError(error);
	}
}
