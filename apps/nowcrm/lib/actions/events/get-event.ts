// lib/actions/events/getEvents.ts
"use server";

import { auth } from "@/auth";
import { DocumentId, Event, StrapiQuery } from "@nowcrm/services";
import { eventsService, handleError, StandardResponse } from "@nowcrm/services/server";

export async function getEventsByCompositionId(
	compositionItemId: DocumentId,
	channelName?: string,
	page?: number,
	pageSize?: number,
	search?: string,
	actions?: string[],
): Promise<StandardResponse<Event[]>> {
	const session = await auth();
	if (!session) {
		return {
			success: false,
			status: 403,
			data: null,
			errorMessage: "Unauthorized",
		};
	}

	try {
		const resolvedPage = page ?? 1;
		const resolvedPageSize = typeof pageSize === "number" ? pageSize : -1;

		const filters: any = {
			composition_item: { id: { $eq: compositionItemId } },
			...(channelName ? { channel: { name: { $eq: channelName } } } : {}),
			...(search ? { action: { $containsi: search } } : {}),
		};

		if (actions && actions.length > 0) {
			filters.$or = actions.map((a) => ({
				action: { $eqi: a },
			}));
		}

		const query: StrapiQuery<Event> = {
			sort: ["id:desc"],
			filters,
			pagination: {
				page: resolvedPage,
				pageSize: resolvedPageSize,
			},
			populate: {
				contact: true,
			},
		};

		const res = await eventsService.find(session.jwt,query);
		return res;
	} catch (e) {
		return handleError(e);
	}
}
