import path from "node:path";
import axios from "axios";
import { env } from "@/common/utils/env-config";
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
		const listResponse = await axios.post(
			`${env.STRAPI_URL}/api/lists`,
			{ data: finalListData },
			{
				headers: {
					Authorization: `Bearer ${env.DAL_STRAPI_API_TOKEN}`,
					"Content-Type": "application/json",
				},
			},
		);

		const createdList = listResponse.data;
		const listId = createdList.data.id;
		const linkedContacts: any[] = [];

		if (!relationCache.lists) {
			relationCache.lists = new Map();
		}
		relationCache.lists.set(finalListData.name, listId);

		if (contactIds.length > 0) {
			const updatePromises = contactIds.map(async (contactId) => {
				const existingLists = Array.from(listContactsMap.entries())
					.filter(([, contacts]) => contacts.includes(contactId))
					.map(([listId]) => listId);

				const updatedListIds = Array.from(new Set([...existingLists, listId]));

				try {
					const response = await axios.put(
						`${env.STRAPI_URL}/api/contacts/${contactId}`,
						{
							data: {
								lists: updatedListIds,
							},
						},
						{
							headers: {
								Authorization: `Bearer ${env.DAL_STRAPI_API_TOKEN}`,
								"Content-Type": "application/json",
							},
						},
					);

					for (const id of updatedListIds) {
						if (!listContactsMap.has(id)) listContactsMap.set(id, []);
						if (!listContactsMap.get(id)!.includes(contactId)) {
							listContactsMap.get(id)!.push(contactId);
						}
					}

					return response.data;
				} catch (err: any) {
					console.error(` Failed to link contact ${contactId}:`, err.message);
					return null;
				}
			});

			const results = await Promise.all(updatePromises);
			linkedContacts.push(...results.filter(Boolean));
		}

		console.log(
			` List "${finalListData.name}" (ID: ${listId}) created and linked with contact IDs`,
		);

		return {
			list: createdList,
			linkedContacts: linkedContacts.length > 0 ? linkedContacts : undefined,
		};
	} catch (error: any) {
		console.error(
			` Error creating list "${finalListData.name}": ${error.message}`,
		);

		if (axios.isAxiosError(error) && error.response) {
			console.error(`Strapi response status: ${error.response.status}`);
			console.error(
				`Strapi response data: ${JSON.stringify(error.response.data, null, 2)}`,
			);
		}

		throw error;
	}
};
