import {
	type Contact,
	type DocumentId,
	ServiceResponse,
} from "@nowcrm/services";
import { contactsService } from "@nowcrm/services/server";
import { env } from "@/common/utils/env-config";

export async function getContact(
	id: DocumentId,
): Promise<ServiceResponse<Contact | null>> {
	const data = await contactsService.findOne(
		id,
		env.JOURNEYS_STRAPI_API_TOKEN,
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
	if (!data.data)
		return ServiceResponse.failure(
			"Could not get contact .Probably strapi is down",
			null,
		);

	if (!Object.hasOwn(data.data, "subscriptions")) {
		return ServiceResponse.failure(
			"Strapi token badly configured for Journeys service (subscriptions)",
			null,
		);
	}
	if (data.data.subscriptions.length > 0) {
		if (!Object.hasOwn(data.data.subscriptions[0], "channel")) {
			return ServiceResponse.failure(
				"Strapi token badly configured for Journeys service (channel)",
				null,
			);
		}
	}

	return ServiceResponse.success("fetched contact", data.data);
}
