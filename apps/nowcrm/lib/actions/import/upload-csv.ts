"use server";

import { dalService, type StandardResponse } from "@nowcrm/services/server";
import { auth } from "@/auth";

export async function uploadCSV(
	formData: FormData,
): Promise<StandardResponse<any>> {
	const session = await auth();
	if (!session) {
		return {
			data: null,
			status: 403,
			success: false,
			errorMessage: "Not authenticated",
		};
	}

	// DAL answers as soon as it has the file and queues the parsing in the
	// background, so awaiting here does not make the user wait for the import
	// itself - it only lets us report an upload that never arrived.
	const res = await dalService.uploadCSV(formData, session.jwt);

	if (!res.success) {
		console.error("Error uploading to DAL:", res.errorMessage);
	}

	return res;
}
