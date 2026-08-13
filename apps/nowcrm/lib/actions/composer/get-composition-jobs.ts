"use server";

import type { JobCompositionRecord } from "@nowcrm/services";
import {
	compositionsService,
	type StandardResponse,
} from "@nowcrm/services/server";
import { auth } from "@/auth";

export async function getCompositionJobs(
	page = 1,
	jobsPerPage = 20,
): Promise<StandardResponse<JobCompositionRecord[]>> {
	const session = await auth();
	if (!session) {
		return {
			data: null,
			status: 403,
			success: false,
		};
	}

	return await compositionsService.getCompositionJobsData(
		session.jwt,
		page,
		jobsPerPage,
	);
}

// export async function getCompositionProgressMap(): Promise<
// 	StandardResponse<Map<string, number>>
// > {
// 	return await composerService.fetchProgressMap();
// }
