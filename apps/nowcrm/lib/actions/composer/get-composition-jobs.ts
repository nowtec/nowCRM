"use server";

import { JobCompositionRecord } from "@nowcrm/services";
import { compositionsService, StandardResponse } from "@nowcrm/services/server";

export async function getCompositionJobs(
	page = 1,
	jobsPerPage = 20,
): Promise<StandardResponse<JobCompositionRecord[]>> {
	return await compositionsService.getCompositionJobsData(page, jobsPerPage);
}

// export async function getCompositionProgressMap(): Promise<
// 	StandardResponse<Map<string, number>>
// > {
// 	return await composerService.fetchProgressMap();
// }
