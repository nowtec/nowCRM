"use server";

import type { ImportRecord } from "@nowcrm/services";
import { dalService, type StandardResponse } from "@nowcrm/services/server";

export async function getPreviousImports(
	page = 1,
	jobsPerPage = 20,
	type: "contacts" | "organizations" | "mass-actions" = "contacts",
): Promise<StandardResponse<ImportRecord[]>> {
	return await dalService.fetchPreviousImports(page, jobsPerPage, type);
}
