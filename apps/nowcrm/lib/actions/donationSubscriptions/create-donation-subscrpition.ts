"use server";
import { auth } from "@/auth";
import { DonationSubscription, Form_DonationSubscription } from "@nowcrm/services";
import { donationSubscriptionsService, handleError, StandardResponse } from "@nowcrm/services/server";

export async function createDonationSubscription(
	values: Form_DonationSubscription,
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
		const res = await donationSubscriptionsService.create(values,session.jwt);
		return res;
	} catch (error) {
		return handleError(error);
	}
}
