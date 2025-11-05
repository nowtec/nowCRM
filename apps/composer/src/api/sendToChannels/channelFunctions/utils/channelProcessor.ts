import {
	type Composition,
	type CompositionItem,
	type Contact,
	checkDocumentId,
	type DocumentId,
	ServiceResponse,
	type sendToChannelsData,
} from "@nowcrm/services";
import { contactsService } from "@nowcrm/services/server";
import { StatusCodes } from "http-status-codes";
import { env } from "@/common/utils/envConfig";
import { logger } from "@/server";
import type { fieldTypes } from "./field_types";
import { getOrCreateContact } from "./getOrCreateContact";

/**
 * Type for message sending function
 */
export type MessageSender = (
	composition: CompositionItem,
	contact: Contact,
	...args: any[]
) => Promise<ServiceResponse<boolean | null>>;

/**
 * Process a channel with common logic for all channel types
 * @param data Channel data
 * @param composition Composition data
 * @param channelName Name of the channel to process
 * @param messageSender Function to send the message for this channel
 * @param additionalArgs Additional arguments to pass to the message sender
 * @returns ServiceResponse with success or failure
 */
export async function processChannel<_T = boolean>(
	data: sendToChannelsData,
	composition: Composition,
	channelName: string,
	messageSender: MessageSender,
	field_types: fieldTypes,
	additionalArgs: any[] = [],
): Promise<ServiceResponse<boolean | null>> {
	const { type, to } = data;

	// Find composition item for the channel
	const composition_item = composition.composition_items.find(
		(item: any) =>
			item.channel.name.toLowerCase() === channelName.toLowerCase(),
	);

	if (!composition_item) {
		return ServiceResponse.failure(
			"Composition doesn't have item for channel",
			null,
			StatusCodes.BAD_REQUEST,
		);
	}

	if (!type) {
		return ServiceResponse.failure(
			"Channel has no type in request",
			null,
			StatusCodes.BAD_REQUEST,
		);
	}

	if (!to) {
		return ServiceResponse.failure(
			"Channel has no recipient in request",
			null,
			StatusCodes.BAD_REQUEST,
		);
	}

	// Process based on recipient type
	switch (type) {
		case "contact":
			return processContactRecipient(
				to,
				composition_item,
				messageSender,
				field_types,
				additionalArgs,
			);

		case "list":
			return processList(to, composition_item, messageSender, additionalArgs);

		case "organization":
			return processOrganization(
				to,
				composition_item,
				messageSender,
				additionalArgs,
			);

		default:
			return ServiceResponse.failure(
				"Channel has unknown type",
				null,
				StatusCodes.BAD_REQUEST,
			);
	}
}

/**
 * Process a single contact or multiple contacts
 * @param to Contact identifier or array of identifiers
 * @param composition_item Composition item
 * @param messageSender Function to send the message
 * @param additionalArgs Additional arguments to pass to the message sender
 * @returns ServiceResponse with success or failure
 */
async function processContactRecipient(
	to: string | DocumentId | string[] | DocumentId[],
	composition_item: CompositionItem,
	messageSender: MessageSender,
	contactField: fieldTypes,
	additionalArgs: any[] = [],
): Promise<ServiceResponse<boolean | null>> {
	// Determine contact type (email or phone) based on the composition channel
	if (checkDocumentId(to)) {
		// Handle contact ID
		const contactResult = await contactsService.findOne(
			to as DocumentId,
			env.COMPOSER_STRAPI_API_TOKEN,
			{
				populate: {
					subscriptions: {
						populate: {
							channel: true,
						},
					},
				},
			},
		);
		if (!contactResult.success || !contactResult.data) {
			return ServiceResponse.failure(
				contactResult.errorMessage || "Contact not found",
				null,
				contactResult.status || StatusCodes.NOT_FOUND,
			);
		}
		return messageSender(
			composition_item,
			contactResult.data,
			...additionalArgs,
		);
	} else if (typeof to === "string") {
		const contactResponse = await getOrCreateContact(contactField, to);
		if (!contactResponse.success || !contactResponse.data) {
			return ServiceResponse.failure(
				contactResponse.errorMessage || "Failed to get or create contact",
				null,
				contactResponse.status,
			);
		}
		return messageSender(
			composition_item,
			contactResponse.data,
			...additionalArgs,
		);
	} else if (Array.isArray(to)) {
		return processMultipleContacts(
			to,
			composition_item,
			messageSender,
			additionalArgs,
			contactField,
			"contact list",
		);
	}

	return ServiceResponse.failure(
		"Invalid contact format",
		null,
		StatusCodes.BAD_REQUEST,
	);
}

/**
 * Process a list or multiple lists
 * @param to List ID or array of list IDs
 * @param composition_item Composition item
 * @param messageSender Function to send the message
 * @param additionalArgs Additional arguments to pass to the message sender
 * @returns ServiceResponse with success or failure
 */
async function processList(
	to: string | number | string[] | number[],
	composition_item: any,
	messageSender: MessageSender,

	additionalArgs: any[] = [],
): Promise<ServiceResponse<boolean | null>> {
	try {
		if (typeof to === "number") {
			// Single list
			const contacts = await fetchContactsFromList(to);
			if (!contacts.success) {
				return contacts as any; //TODO: remove here any
			}
			return sendMessagesToContacts(
				contacts.responseObject as Contact[],
				composition_item,
				messageSender,
				additionalArgs,
				"list",
			);
		} else if (Array.isArray(to)) {
			// Multiple lists
			let allContacts: Contact[] = [];

			for (const listId of to as number[]) {
				const contacts = await fetchContactsFromList(listId);
				if (contacts.success && contacts.responseObject) {
					allContacts = [...allContacts, ...contacts.responseObject];
				}
			}

			// Prevent sending to the same contact multiple times
			const uniqueContacts = Array.from(
				new Map(
					allContacts.map((contact) => [
						contact.email || contact.phone,
						contact,
					]),
				).values(),
			);

			return sendMessagesToContacts(
				uniqueContacts,
				composition_item,
				messageSender,
				additionalArgs,
				"multiple lists",
			);
		}

		return ServiceResponse.failure(
			"Invalid list format",
			null,
			StatusCodes.BAD_REQUEST,
		);
	} catch (error) {
		logger.error(`Error processing list: ${(error as Error).message}`);
		return ServiceResponse.failure(
			`Error processing list: ${(error as Error).message}`,
			null,
			StatusCodes.INTERNAL_SERVER_ERROR,
		);
	}
}

/**
 * Process an organization or multiple organizations
 * @param to Organization ID or array of organization IDs
 * @param composition_item Composition item
 * @param messageSender Function to send the message
 * @param additionalArgs Additional arguments to pass to the message sender
 * @returns ServiceResponse with success or failure
 */
async function processOrganization(
	to: string | number | string[] | number[],
	composition_item: any,
	messageSender: MessageSender,
	additionalArgs: any[] = [],
): Promise<ServiceResponse<boolean | null>> {
	try {
		if (typeof to === "number") {
			const contacts = await fetchContactsFromOrganization(to);
			if (!contacts.success) {
				return contacts as any; //TODO: remove any
			}
			return sendMessagesToContacts(
				contacts.responseObject as Contact[],
				composition_item,
				messageSender,
				additionalArgs,
				"organization",
			);
		} else if (Array.isArray(to)) {
			// Multiple organizations
			let allContacts: Contact[] = [];

			for (const orgId of to as number[]) {
				const contacts = await fetchContactsFromOrganization(orgId);
				if (contacts.success && contacts.responseObject) {
					allContacts = [
						...allContacts,
						...(contacts.responseObject as Contact[]),
					];
				}
			}

			// Prevent sending to the same contact multiple times
			const uniqueContacts = Array.from(
				new Map(
					allContacts.map((contact) => [
						contact.email || contact.phone,
						contact,
					]),
				).values(),
			);

			return sendMessagesToContacts(
				uniqueContacts,
				composition_item,
				messageSender,
				additionalArgs,
				"multiple organizations",
			);
		}

		return ServiceResponse.failure(
			"Invalid organization format",
			null,
			StatusCodes.BAD_REQUEST,
		);
	} catch (error) {
		logger.error(`Error processing organization: ${(error as Error).message}`);
		return ServiceResponse.failure(
			`Error processing organization: ${(error as Error).message}`,
			null,
			StatusCodes.INTERNAL_SERVER_ERROR,
		);
	}
}

/**
 * Process multiple contacts
 * @param contacts Array of contact IDs or identifiers
 * @param composition_item Composition item
 * @param messageSender Function to send the message
 * @param additionalArgs Additional arguments to pass to the message sender
 * @param contactType Type of contact (email or phone)
 * @param errorNaming Name for error messages
 * @returns ServiceResponse with success or failure
 */
async function processMultipleContacts(
	contacts: string[] | DocumentId[],
	composition_item: CompositionItem,
	messageSender: MessageSender,
	additionalArgs: any[],
	contactType: fieldTypes,
	errorNaming: string,
): Promise<ServiceResponse<boolean | null>> {
	try {
		const contactObjects: Contact[] = [];

		for (const contact of contacts) {
			if (checkDocumentId(contact)) {
				const contactResult = await contactsService.findOne(
					contact as DocumentId,
					env.COMPOSER_STRAPI_API_TOKEN,
					{
						populate: {
							subscriptions: {
								populate: {
									channel: true,
								},
							},
						},
					},
				);
				if (contactResult.success && contactResult.data) {
					contactObjects.push(contactResult.data);
				}
			} else {
				const contactResult = await getOrCreateContact(contactType, contact);
				if (contactResult.success && contactResult.data) {
					contactObjects.push(contactResult.data);
				}
			}
		}

		return sendMessagesToContacts(
			contactObjects,
			composition_item,
			messageSender,
			additionalArgs,
			errorNaming,
		);
	} catch (error) {
		logger.error(
			`Error processing multiple contacts: ${(error as Error).message}`,
		);
		return ServiceResponse.failure(
			`Error processing multiple contacts: ${(error as Error).message}`,
			null,
			StatusCodes.INTERNAL_SERVER_ERROR,
		);
	}
}

/**
 * Send messages to multiple contacts
 * @param contacts Array of contacts
 * @param composition_item Composition item
 * @param messageSender Function to send the message
 * @param additionalArgs Additional arguments to pass to the message sender
 * @param errorNaming Name for error messages
 * @returns ServiceResponse with success or failure
 */
async function sendMessagesToContacts(
	contacts: Contact[],
	composition_item: any,
	messageSender: MessageSender,
	additionalArgs: any[],
	errorNaming: string,
): Promise<ServiceResponse<boolean | null>> {
	try {
		if (contacts.length === 0) {
			return ServiceResponse.failure(
				`No contacts found in ${errorNaming}`,
				null,
				StatusCodes.BAD_REQUEST,
			);
		}

		const batchSize = 10;
		const results: ServiceResponse<boolean | null>[] = [];

		for (let i = 0; i < contacts.length; i += batchSize) {
			const batch = contacts.slice(i, i + batchSize);
			const batchPromises = batch.map((contact) =>
				messageSender(composition_item, contact, ...additionalArgs),
			);

			const batchResults = await Promise.all(batchPromises);
			results.push(...batchResults);
		}

		// Check if any messages failed
		const failures = results.filter((result) => !result.success);
		if (failures.length > 0) {
			logger.warn(
				`${failures.length} out of ${results.length} messages failed to send`,
			);
			return ServiceResponse.failure(
				`${failures.length} out of ${results.length} messages failed to send`,
				null,
				StatusCodes.PARTIAL_CONTENT,
			);
		}

		return ServiceResponse.success(
			`Successfully sent ${results.length} messages`,
			null,
		);
	} catch (error) {
		logger.error(
			`Error sending messages to contacts: ${(error as Error).message}`,
		);
		return ServiceResponse.failure(
			`Error sending messages to contacts: ${(error as Error).message}`,
			null,
			StatusCodes.INTERNAL_SERVER_ERROR,
		);
	}
}

/**
 * Fetch all contacts from a list, handling pagination
 * @param listId List ID
 * @returns ServiceResponse with contacts or failure
 */
export async function fetchContactsFromList(
	listId: number,
): Promise<ServiceResponse<Contact[] | null>> {
	try {
		let allContacts: Contact[] = [];
		const list_contacts = await contactsService.find(
			env.COMPOSER_STRAPI_API_TOKEN,
			{
				filters: { lists: { id: { $in: listId } } },
				populate: {
					subscriptions: {
						populate: {
							channel: true,
						},
					},
				},
			},
		);

		if (!list_contacts.data || !list_contacts.meta) {
			return ServiceResponse.failure(
				list_contacts.errorMessage || "List not found",
				null,
				list_contacts.status || StatusCodes.NOT_FOUND,
			);
		}

		allContacts = [...list_contacts.data];
		let currentPage = list_contacts.meta.pagination.page;
		const totalPages = list_contacts.meta.pagination.pageCount;

		while (currentPage < totalPages) {
			currentPage++;
			const result = await contactsService.find(env.COMPOSER_STRAPI_API_TOKEN, {
				filters: { lists: { id: { $in: listId } } },
				populate: {
					subscriptions: {
						populate: {
							channel: true,
						},
					},
				},
				pagination: { page: currentPage },
			});

			if (result.data) {
				allContacts = allContacts.concat(result.data as Contact[]);
			}
		}

		return ServiceResponse.success(
			"Contacts fetched successfully",
			allContacts,
		);
	} catch (error) {
		logger.error(
			`Error fetching contacts from list: ${(error as Error).message}`,
		);
		return ServiceResponse.failure(
			`Error fetching contacts from list: ${(error as Error).message}`,
			null,
			StatusCodes.INTERNAL_SERVER_ERROR,
		);
	}
}

/**
 * Fetch all contacts from an organization, handling pagination
 * @param orgId Organization ID
 * @returns ServiceResponse with contacts or failure
 */
export async function fetchContactsFromOrganization(
	orgId: number,
): Promise<ServiceResponse<Contact[] | null>> {
	try {
		let allContacts: Contact[] = [];
		const org_contacts = await contactsService.find(
			env.COMPOSER_STRAPI_API_TOKEN,
			{
				filters: { organization: { id: { $eq: orgId } } },
				populate: {
					subscriptions: {
						populate: {
							channel: true,
						},
					},
				},
			},
		);

		if (!org_contacts.data || !org_contacts.meta) {
			return ServiceResponse.failure(
				org_contacts.errorMessage || "Organization not found",
				null,
				org_contacts.status || StatusCodes.NOT_FOUND,
			);
		}

		allContacts = [...org_contacts.data];
		let currentPage = org_contacts.meta.pagination.page;
		const totalPages = org_contacts.meta.pagination.pageCount;

		while (currentPage < totalPages) {
			currentPage++;
			const result = await contactsService.find(env.COMPOSER_STRAPI_API_TOKEN, {
				filters: { organization: { id: { $eq: orgId } } },
				populate: {
					subscriptions: {
						populate: {
							channel: true,
						},
					},
				},
				pagination: { page: currentPage },
			});

			if (result.data) {
				allContacts = allContacts.concat(result.data as Contact[]);
			}
		}

		return ServiceResponse.success(
			"Contacts fetched successfully",
			allContacts,
		);
	} catch (error) {
		logger.error(
			`Error fetching contacts from organization: ${(error as Error).message}`,
		);
		return ServiceResponse.failure(
			`Error fetching contacts from organization: ${(error as Error).message}`,
			null,
			StatusCodes.INTERNAL_SERVER_ERROR,
		);
	}
}
