// contactsapp/lib/actions/composer/quickWrite.ts
"use server";
import type { QuickWriteModel } from "@nowcrm/services";
import {
	compositionsService,
	handleError,
	type StandardResponse,
} from "@nowcrm/services/server";
import { auth } from "@/auth";

export async function quickWrite(
	values: QuickWriteModel,
): Promise<StandardResponse<{ result: string }>> {
	const session = await auth();
	if (!session) {
		return {
			data: null,
			status: 403,
			success: false,
		};
	}
	try {
		const res = await compositionsService.quickWrite(values, session.jwt);
		return res;
	} catch (error) {
		return handleError(error);
	}
}
