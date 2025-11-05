import {
	CommunicationChannel,
	type DocumentId,
	ServiceResponse,
} from "@nowcrm/services";
import {
	channelsService,
	contactsService,
	journeyStepsService,
	subscriptionsService,
} from "@nowcrm/services/server";
import { env } from "@/common/utils/env-config";
import { createJob } from "../../../jobs/create-job";
import { logger } from "../../../logger";

/** Allowed webhook event labels */
type StringEvent =
	| "entry.create"
	| "entry.update"
	| "entry.delete"
	| "entry.unpublish";

type AdditionalData = {
	enabled?: boolean;
	entity?: string;
	event?: StringEvent;
	attribute?: {
		label?: string | null;
		value?: boolean | string | number | null;
	};
	[k: string]: any;
};

/** Normalize webhook event into one of the allowed labels or undefined if not recognized */
function normalizeWebhookEvent(ev: any): StringEvent | undefined {
	switch (ev) {
		case "entry.create":
		case "entry.update":
		case "entry.delete":
		case "entry.unpublish":
			return ev;
		default:
			return undefined;
	}
}

/** Extract the current value for a given attribute from the webhook payload */
function readWebhookAttributeValue(data: any, attribute?: string | null) {
	if (!attribute) return undefined;
	const entry = data?.entry ?? {};

	if (attribute in entry) return entry[attribute];

	return undefined;
}

/** Compare step event requirements to the webhook event and optional attribute constraint */
function eventMatches(
	stepEvent: StringEvent | undefined | null,
	data: any,
	attribute?: { label?: string | null; value?: any },
): boolean {
	if (!stepEvent) return false;

	const webhookLabel = normalizeWebhookEvent(data?.event);
	if (!webhookLabel) return false;

	if (stepEvent !== webhookLabel) return false;

	if (!attribute?.label) return true;

	const expected = attribute.value;
	const rawActual = readWebhookAttributeValue(data, attribute.label);

	// --- Boolean handling ---
	if (
		typeof expected === "boolean" ||
		expected === "true" ||
		expected === "false"
	) {
		const boolExpected =
			typeof expected === "boolean" ? expected : expected === "true";
		return Boolean(rawActual) === boolExpected;
	}

	// --- Number (ID) handling ---
	if (typeof expected === "number") {
		const actualNum =
			typeof rawActual === "object" && rawActual?.id ? rawActual.id : rawActual;
		return Number(actualNum) === expected;
	}

	// --- String fallback (including numeric-looking strings) ---
	return String(rawActual) === String(expected);
}

/** Contact id extraction */
function getContactIdFromWebhook(data: any): DocumentId | undefined {
	if (data?.model === "contact") return data?.entry?.documentId;
	return data?.entry?.contact?.documentId;
}

export async function processTriggerMessage(data: any) {
	const normalizedEvent = normalizeWebhookEvent(data?.event);
	logger.info(`Finding trigger nodes for ${normalizedEvent ?? data?.event}`);

	const contactId = getContactIdFromWebhook(data);
	if (!contactId) {
		return ServiceResponse.failure(
			"No contact was found in that webhook call",
			null,
		);
	}

	const trigger_steps = await journeyStepsService.findAll(
		env.JOURNEYS_STRAPI_API_TOKEN,
		{
			filters: {
				type: { $eq: "trigger" },
				journey: { active: { $eq: true } },
			},
			populate: {
				journey: true,
				connections_from_this_step: {
					populate: {
						target_step: {
							populate: { composition: true, channel: true },
						},
					},
				},
			},
		},
	);

	if (!trigger_steps.data) {
		return ServiceResponse.failure(
			"Could not get journey step. Probably Strapi is down",
			null,
		);
	}

	const filtered_steps = trigger_steps.data.filter((item) => {
		const add = (item.additional_data ?? {}) as AdditionalData;

		const entityMatches = add.entity === data?.model;
		const enabled = add.enabled === true;
		const eventOk = eventMatches(add.event, data, add.attribute);

		return entityMatches && enabled && eventOk;
	});
	if (filtered_steps.length > 0) {
		const email_channel = await channelsService.find(
			env.JOURNEYS_STRAPI_API_TOKEN,
			{
				filters: {
					name: { $eqi: "Email" },
				},
			},
		);
		if (email_channel.data) {
			const contact = await contactsService.findOne(
				contactId,
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
			if (contact.data) {
				await contactsService.checkSubscription(
					env.JOURNEYS_STRAPI_API_TOKEN,
					contact.data,
					CommunicationChannel.EMAIL,
				);
				await subscriptionsService.create(
					{
						channel: email_channel.data[0].documentId,
						active: true,
						contact: contactId,
						subscribed_at: new Date(),
						publishedAt: new Date(),
					},
					env.JOURNEYS_STRAPI_API_TOKEN,
				);
			}
		}
	}
	for (const step of filtered_steps) {
		if (step.connections_from_this_step?.length) {
			for (const connection_step of step.connections_from_this_step) {
				logger.info(
					`Creating job for -> connection step ${connection_step.id} with target ${connection_step.target_step.id}`,
				);
				await createJob({
					contact: contactId,
					journey: step.journey.documentId,
					type: connection_step.target_step.type,
					journey_step: connection_step.target_step.documentId,
					channel: connection_step.target_step.channel?.documentId,
					composition: connection_step.target_step.composition?.documentId,
					timing: connection_step.target_step.timing,
					ignoreSubscription: true,
				});
			}
		}
	}
}
