import { CommunicationChannel, type Contact } from "@nowcrm/services";
import {
	channelsService,
	contactsService,
	type StandardResponse,
	subscriptionsService,
} from "@nowcrm/services/server";
import { StatusCodes } from "http-status-codes";
import { env } from "@/common/utils/envConfig";
import { logger } from "@/server";
import type { fieldTypes } from "./field_types";

export async function getOrCreateContact(
	field: fieldTypes,
	value: string,
): Promise<StandardResponse<Contact>> {
	// Dynamically determine the property key based on the field.
	// If field is "email", keep it as "email"; if field is "phone", use "mobile_phone".
	try {
		// Use the computed property key in the find query.
		const check = await contactsService.find(env.COMPOSER_STRAPI_API_TOKEN, {
			filters: {
				[field]: { $eqi: value },
			},
			populate: {
				subscriptions: {
					populate: {
						channel: true,
					},
				},
			},
		});

		if (!check.success) {
			if (check.status === 403) {
				return {
					data: null,
					success: false,
					status: StatusCodes.UNAUTHORIZED,
					errorMessage:
						"Strapi token badly configured for Composer service (contact)",
				};
			}
			return {
				data: null,
				success: false,
				status: check.status || StatusCodes.INTERNAL_SERVER_ERROR,
				errorMessage: check.errorMessage || "Database service unavailable",
			};
		}

		// If no contact found, create a new one using the computed property key.
		if (!check.data || check.data.length === 0) {
			const newContact = await contactsService.create(
				{
					first_name: "",
					[field]: value,
					publishedAt: new Date(),
					language: "en",
				},
				env.COMPOSER_STRAPI_API_TOKEN,
			);

			if (!newContact.success || !newContact.data) {
				if (newContact.status === 403) {
					return {
						data: null,
						success: false,
						status: StatusCodes.UNAUTHORIZED,
						errorMessage:
							"Strapi token badly configured for Composer service (contact)",
					};
				}
				return {
					data: null,
					success: false,
					status: newContact.status || StatusCodes.INTERNAL_SERVER_ERROR,
					errorMessage: newContact.errorMessage || "Failed to create contact",
				};
			}

			const channel = await channelsService.find(
				env.COMPOSER_STRAPI_API_TOKEN,
				{
					filters: {
						name: { $eqi: CommunicationChannel.EMAIL },
					},
				},
			);
			if (!channel.data || !channel.success || channel.data.length === 0) {
				return {
					data: null,
					success: false,
					status: channel.status || StatusCodes.INTERNAL_SERVER_ERROR,
					errorMessage: channel.errorMessage || "Failed to find channel",
				};
			}

			await subscriptionsService.create(
				{
					channel: channel.data[0].documentId,
					contact: newContact.data.documentId,
					active: true,
					publishedAt: new Date(),
					subscribed_at: new Date(),
				},
				env.COMPOSER_STRAPI_API_TOKEN,
			);

			// Create function by default returns non populated entities
			// Reason of running same function allover again is to return a populated contact
			const populatedNewContact = await getOrCreateContact(field, value);

			if (!populatedNewContact.success || !populatedNewContact.data) {
				return {
					data: null,
					success: false,
					status: populatedNewContact.status,
					errorMessage: populatedNewContact.errorMessage,
				};
			}

			return {
				data: populatedNewContact.data as Contact,
				success: true,
				status: StatusCodes.CREATED,
			};
		}

		if (!Object.hasOwn(check.data[0], "subscriptions")) {
			const errorMessage =
				"Strapi token badly configured for Composer service (subscriptions)";
			return {
				data: null,
				success: false,
				status: StatusCodes.PARTIAL_CONTENT,
				errorMessage,
			};
		}
		if (check.data[0].subscriptions.length > 0) {
			if (!Object.hasOwn(check.data[0].subscriptions[0], "channel")) {
				const errorMessage =
					"Strapi token badly configured for Composer service (channel)";
				return {
					data: null,
					success: false,
					status: StatusCodes.PARTIAL_CONTENT,
					errorMessage,
				};
			}
		}

		return {
			data: check.data[0],
			success: true,
			status: StatusCodes.OK,
		};
	} catch (error) {
		logger.error(
			`Error getting or creating contact: ${(error as Error).message}`,
		);
		return {
			data: null,
			success: false,
			status: StatusCodes.INTERNAL_SERVER_ERROR,
			errorMessage: `Error getting or creating contact: ${(error as Error).message}`,
		};
	}
}
