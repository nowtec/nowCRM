"use server";
import { auth } from "@/auth";
import { DocumentId } from "@nowcrm/services";
import { campaignCategoriesService, handleError, StandardResponse } from "@nowcrm/services/server";
export async function deleteCampaignCategoryAction(
	id: DocumentId,
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
		const res = await campaignCategoriesService.delete(id,session.jwt);
		return res;
	} catch (error) {
		console.error("Error deleting campaign category:", error);
		return handleError(error);
	}
}
