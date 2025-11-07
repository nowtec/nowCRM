"use server";

import { env } from "@/lib/config/envConfig";
import { Term } from "@nowcrm/services";
import { StandardResponse, termsService } from "@nowcrm/services/server";


export async function getLatestTerms(
	_locale = "en",
): Promise<StandardResponse<Term[]>> {

	const termData = await termsService.find(
		env.CRM_STRAPI_API_TOKEN,
		{
			populate: "*",
			filters: { active: { $eq: true } },
			sort: ["id:desc"]
		}
	);
	return termData;
}
