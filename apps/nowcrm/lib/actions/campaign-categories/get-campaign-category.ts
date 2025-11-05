"use server";
import { auth } from "@/auth";
import { type CampaignCategory } from "@nowcrm/services";
import { handleError, StandardResponse } from "@nowcrm/services/server";
import { campaignCategoriesService } from "@nowcrm/services/server";

export async function getCampaignCategories(): Promise<StandardResponse<CampaignCategory[]>> {
	const session = await auth();
	if (!session) {
		return {
			data: null,
			status: 403,
			success: false,
		};
	}
	try {
			const res = await campaignCategoriesService.find(session.jwt, {
				pagination: { page: 1, pageSize: 100 },
				sort: ["name:asc"],
			});
		return res;
	} catch (error) {
		return handleError(error);
	}
}
