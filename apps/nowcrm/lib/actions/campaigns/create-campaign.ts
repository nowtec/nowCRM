"use server";
import { auth } from "@/auth";
import { type Campaign, DocumentId } from "@nowcrm/services";
import { campaignsService, handleError, StandardResponse } from "@nowcrm/services/server";

export async function createCampaign(
	name: string,
	description?: string,
	campaignCategoryId?: DocumentId,
): Promise<StandardResponse<Campaign>> {
	const session = await auth();
	if (!session) {
		return {
			data: null,
			status: 403,
			success: false,
		};
	}
	try {
		const res = await campaignsService.create({
			name: name,
			description: description,
			campaign_category: campaignCategoryId
				? { connect: [campaignCategoryId] }
				: undefined,
			publishedAt: new Date(),
		},session.jwt);
		return res;
	} catch (error) {
		return handleError(error);
	}
}
