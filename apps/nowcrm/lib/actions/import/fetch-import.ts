"use server";

import type { ImportRecord } from "@nowcrm/services";
import { dalService, type StandardResponse } from "@nowcrm/services/server";
import { auth } from "@/auth";

export async function getPreviousImports(
	page = 1,
	jobsPerPage = 20,
	type: "contacts" | "organizations" | "mass-actions" = "contacts",
): Promise<StandardResponse<ImportRecord[]>> {
	const session = await auth();
	if (!session) {
		return {
			data: null,
			status: 403,
			success: false,
		};
	}

	return await dalService.fetchPreviousImports(
		session.jwt,
		page,
		jobsPerPage,
		type,
	);
}
