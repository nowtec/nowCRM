"use server";
import { auth } from "@/auth";
import { type Campaign } from "@nowcrm/services";
import { campaignsService, handleError, StandardResponse } from "@nowcrm/services/server";

export async function getCampaigns(): Promise<StandardResponse<Campaign[]>> {
	const session = await auth();
	if (!session) {
		return {
			data: null,
			status: 403,
			success: false,
		};
	}
	try {
		const res = await campaignsService.find(session.jwt, {
			pagination: { page: 1, pageSize: 100 },
			sort: ["name:asc"],
		});
		return res;
	} catch (error) {
		return handleError(error);
	}
}
