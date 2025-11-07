"use server";

import { auth } from "@/auth";
import { DocumentId } from "@nowcrm/services";
import { BaseServiceName, handleError, ServiceFactory } from "@nowcrm/services/server";

export async function addTag(
	serviceName: BaseServiceName,
	entityId: DocumentId,
	tagId: DocumentId,
) {
	const session = await auth();
	if (!session) {
		return {
			data: null,
			status: 403,
			success: false,
		};
	}

	try {
		const service = ServiceFactory.getService(serviceName);
		const res = await service.update(entityId, {
			tags: { connect: [tagId] },
		}, session.jwt);
		return res;
	} catch (error) {
		return handleError(error);
	}
}
