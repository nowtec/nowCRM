// actions/deleteContactAction.ts
"use server";
import { auth } from "@/auth";
import { DonationTransaction, Form_DonationTransaction } from "@nowcrm/services";
import { donationTransactionsService, handleError, StandardResponse } from "@nowcrm/services/server";
export async function createTransaction(
	values: Form_DonationTransaction,
): Promise<StandardResponse<DonationTransaction>> {
	const session = await auth();
	if (!session) {
		return {
			data: null,
			status: 403,
			success: false,
		};
	}
	try {
		const res = await donationTransactionsService.create(values,session.jwt);
		return res;
	} catch (error) {
		return handleError(error);
	}
}
