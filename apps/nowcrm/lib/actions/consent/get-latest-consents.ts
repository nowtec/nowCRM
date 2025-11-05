"use server";

import { Consent } from "@nowcrm/services";
import { consentsService, handleError, StandardResponse } from "@nowcrm/services/server";
import { DocumentId } from "@nowcrm/services";
import { env } from "@/lib/config/envConfig";
export async function getLatestConsents(
	locale: string,
	id?: DocumentId,
): Promise<StandardResponse<Consent[]>> {
	try {
	// Step 1: If version is provided, attempt to fetch it
	if (id !== undefined) {
		const filteredResponse = await consentsService.find(env.CRM_STRAPI_API_TOKEN,
			{
				locale,
				populate: "*",
				filters: {
					active: { $eq: true },
					version: { $eqi: String(id) },
				},
			}
		);
		const found = filteredResponse?.data?.length;
		if (found) {
			return filteredResponse;
		}
		// Else: fall through to fallback logic
	}

	// Step 2: Get the latest active consent (fallback or default)
	const latestResponse = await consentsService.find(env.CRM_STRAPI_API_TOKEN,
		{
			locale,
			sort: ["id:desc"],
			pagination: { pageSize: 1 },
			populate: "*",
			filters: {
				active: { $eq: true },
			},
		},
	);

		return latestResponse;
	} catch (error) {
		return handleError(error);
	}
}
