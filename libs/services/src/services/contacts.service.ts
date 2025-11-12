import { APIRoutesStrapi } from "../api-routes/api-routes-strapi";
import type { CommunicationChannelKeys } from "../static/communication-channel";
import type { Contact, Form_Contact } from "../types/contact";
import BaseService from "./common/base.service";
import { handleError, type StandardResponse } from "./common/response.service";
import { settingsService } from "./settings.service";

class ContactsService extends BaseService<Contact, Form_Contact> {
	public constructor() {
		super(APIRoutesStrapi.CONTACTS);
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
}

export const contactsService = new ContactsService();
