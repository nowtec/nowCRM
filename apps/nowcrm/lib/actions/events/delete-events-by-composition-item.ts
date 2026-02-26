"use server";

import type { DocumentId, Event, StrapiQuery } from "@nowcrm/services";
import {
	eventsService,
	handleError,
	type StandardResponse,
} from "@nowcrm/services/server";
import { auth } from "@/auth";

interface DeleteEventsByCompositionItemResult {
	totalCount: number;
	deletedCount: number;
	failedCount: number;
}

export async function deleteEventsByCompositionItemAction(
	compositionItemId: DocumentId,
	channelName?: string,
): Promise<StandardResponse<DeleteEventsByCompositionItemResult>> {
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
		const query: StrapiQuery<Event> = {
			filters: {
				composition_item: { documentId: { $eq: compositionItemId } },
				...(channelName ? { channel: { name: { $eq: channelName } } } : {}),
			},
			pagination: {
				pageSize: 100,
			},
		};

		const eventsResponse = await eventsService.findAll(session.jwt, query);
		if (!eventsResponse.success) {
			return {
				success: false,
				status: eventsResponse.status,
				data: null,
				errorMessage: eventsResponse.errorMessage || "Failed to load events",
			};
		}

		const events = eventsResponse.data ?? [];
		if (events.length === 0) {
			return {
				success: true,
				status: 200,
				data: {
					totalCount: 0,
					deletedCount: 0,
					failedCount: 0,
				},
			};
		}

		let deletedCount = 0;
		let failedCount = 0;
		let firstDeleteError: string | undefined;

		for (const event of events) {
			if (!event.documentId) {
				failedCount += 1;
				firstDeleteError ||= "Some events do not have documentId";
				continue;
			}

			const deleteResponse = await eventsService.delete(
				event.documentId,
				session.jwt,
			);
			if (deleteResponse.success) {
				deletedCount += 1;
				continue;
			}

			failedCount += 1;
			firstDeleteError ||= deleteResponse.errorMessage;
		}

		const result: DeleteEventsByCompositionItemResult = {
			totalCount: events.length,
			deletedCount,
			failedCount,
		};

		if (failedCount > 0) {
			return {
				success: false,
				status: 500,
				data: result,
				errorMessage:
					firstDeleteError ||
					`Failed to delete ${failedCount} of ${events.length} events`,
			};
		}

		return {
			success: true,
			status: 200,
			data: result,
		};
	} catch (error) {
		return handleError(error);
	}
}
