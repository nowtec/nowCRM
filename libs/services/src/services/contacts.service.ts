import { API_ROUTES_STRAPI } from "../api-routes/api-routes-strapi";
import { envServices } from "../env-config";
import type { CommunicationChannelKeys } from "../static/communication-channel";
import type { DocumentId } from "../types/common/base-type";
import type { Contact, Form_Contact } from "../types/contact";
import BaseService from "./common/base.service";
import {
	handleError,
	handleResponse,
	type StandardResponse,
} from "./common/response.service";
import { settingsService } from "./settings.service";

class ContactsService extends BaseService<Contact, Form_Contact> {
	public constructor() {
		super(API_ROUTES_STRAPI.CONTACTS);
	}

	async checkSubscription(
		token: string,
		contact: Contact,
		channelName: CommunicationChannelKeys,
	): Promise<StandardResponse<boolean>> {
		try {
			//TODO: remove 1 when setting different for each user
			const settings = await settingsService.find(token);

			if (!settings.data) {
				return {
					errorMessage: "Could not get settings .Probably strapi is down",
					data: null,
					status: 400,
					success: false,
				};
			}

			if (settings.data[0]?.subscription === "ignore") {
				return {
					data: true,
					status: 200,
					success: true,
				};
			}

			if (
				contact.subscriptions.some(
					(item) =>
						item.channel.name
							.toLowerCase()
							.includes(channelName.toLowerCase()) && item.active,
				)
			) {
				return {
					data: true,
					status: 200,
					success: true,
				};
			}

			return {
				errorMessage:
					"Contact doesnt have active subscription for provided channel",
				data: false,
				status: 200,
				success: true,
			};
		} catch (error: any) {
			return handleError(error);
		}
	}

	async anonymizeContact(
		contactId: DocumentId,
		token: string,
	): Promise<StandardResponse<Contact>> {
		const url = new URL(
			`strapi/api/${API_ROUTES_STRAPI.CONTACT_ANONYMIZE_DATA}`,
			envServices.API_GATEWAY,
		);

		try {
			const response = await fetch(url, {
				method: "POST",
				headers: this.getHeaders(true, token),
				body: JSON.stringify({ contactId }),
			});

			const result = await handleResponse<Contact>(response);
			return result;
		} catch (error: any) {
			return handleError(error);
		}
	}

	async duplicate(
		contactId: DocumentId,
		token: string,
	): Promise<StandardResponse<null>> {
		try {
			const url = new URL(
				`strapi/api/${API_ROUTES_STRAPI.CONTACTS_DUPLICATE}`,
				envServices.API_GATEWAY,
			);

			const response = await fetch(url, {
				method: "POST",
				headers: this.getHeaders(true, token),
				body: JSON.stringify({ id: contactId }),
			});

			const result = await handleResponse<null>(response);

			return result;
		} catch (error: any) {
			return handleError(error);
		}
	}

	async exportUserData(
		contactId: DocumentId,
		token: string,
	): Promise<StandardResponse<Contact>> {
		const url = new URL(
			`strapi/api/${API_ROUTES_STRAPI.CONTACT_EXPORT_DATA}`,
			envServices.API_GATEWAY,
		);
		try {
			const response = await fetch(url, {
				method: "POST",
				headers: this.getHeaders(true, token),
				body: JSON.stringify({ contactId }),
			});
			console.log(response);

			const result = await handleResponse<Contact>(response);
			return result;
		} catch (error: any) {
			return handleError(error);
		}
	}

	async fetchWithFilters(
		filters: any,
		page = 1,
		pageSize = 5,
		token: string,
		sortBy?: string,
		sortOrder: "asc" | "desc" = "desc",
	): Promise<{ data: Contact[]; totalCount: number }> {
		try {
			const response = await this.find(token, {
				filters,
				pagination: {
					page,
					pageSize,
				},
				populate: {
					subscriptions: { populate: ["channel"] },
					contact_interests: true,
					lists: true,
					keywords: true,
					tags: true,
					journeys: true,
					journey_steps: true,
				},
				sort: sortBy ? [`${sortBy}:${sortOrder}` as any] : undefined,
			});
			return {
				data: response.data || [],
				totalCount: response.meta?.pagination?.total || 0,
			};
		} catch (error) {
			console.error("Error fetching contacts with filters:", error);
			throw error;
		}
	}

	async exportCsv(ids: DocumentId[], token: string): Promise<string> {
		const formatCell = (raw: any): string => {
			if (raw == null) {
				return "";
			}
			if (Array.isArray(raw)) {
				return raw
					.map((item) =>
						typeof item === "object"
							? (item.name ?? item.label ?? JSON.stringify(item))
							: String(item),
					)
					.join("; ");
			}
			if (typeof raw === "object") {
				return raw.name ?? raw.label ?? JSON.stringify(raw);
			}
			return String(raw);
		};

		const response = await this.find(token, {
			filters: { documentId: { $in: ids } },
			populate: "*",
		});
		const data: Contact[] = response.data || [];

		if (!data.length) {
			return "";
		}

		const headers = Object.keys(data[0] as any);

		const rows = data.map((contact) =>
			headers
				.map((key) => {
					const raw = (contact as any)[key];
					const cell = formatCell(raw);
					return `"${cell.replace(/"/g, '""')}"`;
				})
				.join(","),
		);

		return [headers.join(","), ...rows].join("\r\n");
	}
}

export const contactsService = new ContactsService();
