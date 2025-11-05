// actions/deleteContactAction.ts
"use server";
import { auth } from "@/auth";
import { DocumentId, DonationSubscription, Form_DonationSubscription } from "@nowcrm/services";
import { donationSubscriptionsService, handleError, StandardResponse } from "@nowcrm/services/server";

export async function updateDonationSubscription(
	id: DocumentId,
	values: Partial<Form_DonationSubscription>,
): Promise<StandardResponse<DonationSubscription>> {
	const session = await auth();
	if (!session) {
		return {
			data: null,
			status: 403,
			success: false,
		};
	}
	try {
		const res = await donationSubscriptionsService.update(id, values,session.jwt);
		return res;
	} catch (error) {
		return handleError(error);
	}
}
