"use server";

import type { BaseServiceName } from "@nowcrm/services";
import { ServiceFactory } from "@nowcrm/services/server";
import { auth } from "@/auth";
import { fieldsFromVisible } from "@/lib/generate-populate-fields";

export async function fetchDataForVisibleColumns(input: {
	visibleIds: string[];
	page: number;
	pageSize: number;
	sortBy: string;
	sortOrder: "asc" | "desc";
	filters?: any;
	serviceName: BaseServiceName;
}) {
	const session = await auth();
	if (!session) {
		return {
			data: null,
			status: 403,
			success: false,
		};
	}
	const {
		visibleIds,
		page,
		pageSize,
		sortBy,
		sortOrder,
		filters,
		serviceName,
	} = input;

	const fields = fieldsFromVisible(visibleIds, [
		sortBy,
		"id",
		"createdAt",
		"updatedAt",
	]);
	const service = ServiceFactory.getService(serviceName);

	return await service.find(session?.jwt, {
		fields: fields as any,
		populate: {
			salutation: { fields: ["name"] },
			title: { fields: ["name"] },
			subscriptions: {
				fields: ["active"],
				populate: { channel: { fields: ["name"] } },
			},
			organization: { fields: ["name"] },
			department: { fields: ["name"] },
			job_title: { fields: ["name"] },
			industry: { fields: ["name"] },
			contact_types: { fields: ["name"] },
			lists: { fields: ["name"] },
			keywords: { fields: ["name"] },
			contact_interests: { fields: ["name"] },
			journeys: { fields: ["name"] },
			journey_steps: { fields: ["name"] },
			surveys: { fields: ["name"] },
			tags: { fields: ["name", "color"] },
		},
		sort: [`${sortBy}:${sortOrder}`] as any,
		pagination: { page, pageSize },
		filters: { ...(filters ?? {}) },
	});
}
