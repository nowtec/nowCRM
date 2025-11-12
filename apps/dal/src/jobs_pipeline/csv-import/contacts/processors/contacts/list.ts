import path from "node:path";
import { env } from "@/common/utils/env-config";
import { fetchJson } from "@/common/utils/fetch-json";
import { listContactsMap, relationCache } from "../helpers/cache";

export const createList = async (
	listData?: {
		name?: string;
		description?: string;
		is_active?: boolean;
		source_file?: string;
		[key: string]: any;
	},
	contactIds: number[] = [],
	filename?: string,
): Promise<{
	list: any;
	linkedContacts?: any[];
}> => {
	let finalListData: any = {};

	if (listData && Object.keys(listData).length > 0) {
		finalListData = { ...listData };
	} else if (filename) {
		const baseFilename = path.basename(filename, path.extname(filename));
		finalListData = {
			name: `${baseFilename}`,
			description: `List of contacts imported from ${filename}`,
			is_active: true,
			source_file: filename,
		};
	} else {
		const now = new Date();
		const formattedDate = now.toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});

		finalListData = {
			name: `Contact List - ${formattedDate}`,
			description: `List of contacts created on ${formattedDate}`,
			is_active: true,
		};
	}

	try {
		const listResponse = await fetchJson<{
			data: { id: number; attributes: any };
		}>(`${env.DAL_STRAPI_API_URL}/api/lists`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${env.DAL_STRAPI_API_TOKEN}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ data: finalListData }),
		});

		const createdList = listResponse;
		const listId = createdList.data.id;
		const linkedContacts: any[] = [];

		if (!relationCache.lists) {
			relationCache.lists = new Map();
		}
		//check here
		relationCache.lists.set(finalListData.name, {
			id: listId,
			documentId: null,
		});

		if (contactIds.length > 0) {
			const updatePromises = contactIds.map(async (contactId) => {
				const existingLists = Array.from(listContactsMap.entries())
					.filter(([, contacts]) => contacts.includes(contactId))
					.map(([listId]) => listId);

				const updatedListIds = Array.from(new Set([...existingLists, listId]));

				try {
					const response = await fetchJson<{
						data: any;
					}>(`${env.DAL_STRAPI_API_URL}/api/contacts/${contactId}`, {
						method: "PUT",
						headers: {
							Authorization: `Bearer ${env.DAL_STRAPI_API_TOKEN}`,
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							data: { lists: updatedListIds },
						}),
					});

					for (const id of updatedListIds) {
						if (!listContactsMap.has(id)) listContactsMap.set(id, []);
						if (!listContactsMap.get(id)?.includes(contactId)) {
							listContactsMap.get(id)?.push(contactId);
						}
					}

					return response.data;
				} catch (err: any) {
					console.error(`Failed to link contact ${contactId}: ${err.message}`);
					return null;
				}
			});

			const results = await Promise.all(updatePromises);
			linkedContacts.push(...results.filter(Boolean));
		}

		console.log(
			`List "${finalListData.name}" (ID: ${listId}) created and linked with contact IDs`,
		);

		return {
			list: createdList,
			linkedContacts: linkedContacts.length > 0 ? linkedContacts : undefined,
		};
	} catch (error: any) {
		console.error(
			`Error creating list "${finalListData.name}": ${error.message}`,
		);
		throw error;
	}
};
