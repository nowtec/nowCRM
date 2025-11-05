// actions/deleteContactAction.ts
"use server";
import { auth } from "@/auth";
import { CommunicationChannelKeys, CompositionItem, DocumentId } from "@nowcrm/services";
import { channelsService, compositionItemsService, handleError, StandardResponse } from "@nowcrm/services/server";

export async function createCompositionItem(
	composition_id: DocumentId,
	channel_name: CommunicationChannelKeys,
): Promise<StandardResponse<CompositionItem>> {
	const session = await auth();
	if (!session) {
		return {
			data: null,
			status: 403,
			success: false,
		};
	}
	try {
		const channel = await channelsService.find(session.jwt, {
			filters: { name: { $eqi: channel_name } },
		});
		if (!channel.data || !channel.success) {
			return handleError(new Error("Error creating composition: no channel found"));
		}
		const res = await compositionItemsService.create({
			composition: composition_id,
			channel: channel.data[0].documentId,
			result: "-",
			publishedAt: new Date(),
		},session.jwt);
		return res;
	} catch (error) {
		return handleError(error);
	}
}
