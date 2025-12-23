import {
	checkDocumentId,
	type DocumentId,
	ServiceResponse,
} from "@nowcrm/services";
import {
	channelsService,
	contactsService,
	journeyStepsService,
	settingsService,
	subscriptionsService,
} from "@nowcrm/services/server";
import { env } from "@/common/utils/env-config";
import { createJob } from "../../../jobs/create-job";
import { strapiCircuitBreaker } from "../../../lib/functions/helpers/circuit-breaker";
import { enforcePaginationLimits } from "../../../lib/functions/helpers/pagination-limiter";
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
		value?: boolean | string | DocumentId | number | null;
		attribute_name?: string | null;
		operator?: "gt" | "lt" | "eq" | null;
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
	// Handle nested attribute paths like "action_type.name"
	if (attribute.includes(".")) {
		const parts = attribute.split(".");
		let current: any = entry;

		for (const part of parts) {
			if (current === null || current === undefined) {
				return undefined;
			}
			current = current[part];
		}

		return current;
	}

	// Handle simple attribute names
	if (attribute in entry) return entry[attribute];

	return undefined;
}

/** Compare step event requirements to the webhook event and optional attribute constraint */
function eventMatches(
	stepEvent: StringEvent | undefined | null,
	data: any,
	attribute?: {
		label?: string | null;
		value?: boolean | string | DocumentId | number | null;
		attribute_name?: string | null;
		operator?: "gt" | "lt" | "eq" | null;
	},
): boolean {
	if (!stepEvent) return false;

	const webhookLabel = normalizeWebhookEvent(data?.event);
	if (!webhookLabel) return false;

	if (stepEvent !== webhookLabel) return false;

	if (!attribute?.label) return true;

	const expected = attribute.value;
	const rawActual = readWebhookAttributeValue(
		data,
		attribute.attribute_name ?? attribute.label,
	);
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

	// --- Numeric comparison with operator (for donation amounts, etc.) ---
	// Check this before documentId to handle numeric comparisons first
	if (
		attribute.operator &&
		(typeof expected === "number" ||
			(typeof expected === "string" && !Number.isNaN(Number(expected))))
	) {
		const numExpected =
			typeof expected === "number" ? expected : Number(expected);
		const numActual =
			typeof rawActual === "number"
				? rawActual
				: typeof rawActual === "string"
					? Number(rawActual)
					: null;

		if (numActual === null || Number.isNaN(numActual)) {
			return false;
		}

		switch (attribute.operator) {
			case "gt":
				return numActual > numExpected;
			case "lt":
				return numActual < numExpected;
			case "eq":
				return numActual === numExpected;
			default:
				return numActual === numExpected;
		}
	}

	// --- documentId (ID) handling ---
	if (expected && typeof expected === "string" && checkDocumentId(expected)) {
		return rawActual === expected;
	}

	// --- String fallback (including numeric-looking strings) ---
	return String(rawActual) === String(expected);
}

/** Contact id extraction - tries documentId first, then falls back to id or email lookup */
async function getContactIdFromWebhook(
	data: any,
): Promise<DocumentId | undefined> {
	if (data?.model === "contact") {
		if (data?.entry?.documentId) {
			return data.entry.documentId;
		}
	}

	if (data?.entry?.contact?.documentId) {
		return data.entry.contact.documentId;
	}

	// Fallback: try to extract id or email and find contact
	const entry = data?.model === "contact" ? data?.entry : data?.entry?.contact;
	if (!entry) {
		return undefined;
	}

	if (entry.id) {
		const idResult = await strapiCircuitBreaker.execute(() =>
			contactsService.find(env.JOURNEYS_STRAPI_API_TOKEN, {
				filters: { id: { $eq: entry.id } },
				pagination: { page: 1, pageSize: 1 },
			}),
		);
		if (idResult.data && idResult.data.length > 0) {
			return idResult.data[0].documentId;
		}
	}

	if (entry.email) {
		const emailResult = await strapiCircuitBreaker.execute(() =>
			contactsService.findAll(env.JOURNEYS_STRAPI_API_TOKEN, {
				filters: { email: { $eqi: entry.email } },
				pagination: { page: 1, pageSize: 1 },
			}),
		);
		if (emailResult.data && emailResult.data.length > 0) {
			return emailResult.data[0].documentId;
		}
	}

	return undefined;
}

export async function processTriggerMessage(data: any) {
	const normalizedEvent = normalizeWebhookEvent(data?.event);
	logger.debug(`Finding trigger nodes for ${normalizedEvent ?? data?.event}`);
	const contactId = await getContactIdFromWebhook(data);
	if (!contactId) {
		return ServiceResponse.failure(
			"No contact was found in that webhook call",
			null,
		);
	}

	// Use circuit breaker and pagination limits for Strapi calls
	const trigger_steps = await strapiCircuitBreaker.execute(() =>
		journeyStepsService.findAll(
			env.JOURNEYS_STRAPI_API_TOKEN,
			enforcePaginationLimits({
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
			}),
		),
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
				const emailChannelId = email_channel.data[0].documentId;

				// Check settings to see if subscription checking should be ignored
				const settings = await settingsService.find(
					env.JOURNEYS_STRAPI_API_TOKEN,
				);
				const shouldIgnoreSubscriptions =
					settings.data?.[0]?.subscription === "ignore";

				// Check if contact has any subscription (active or inactive) for email channel
				const existingSubscription = contact.data.subscriptions?.find(
					(sub) => sub.channel?.documentId === emailChannelId,
				);

				// If there's an inactive subscription, don't create a new one and don't send
				if (existingSubscription && !existingSubscription.active) {
					logger.debug(
						`Contact ${contactId} has inactive subscription for email channel. Skipping subscription creation and job creation.`,
					);
					return ServiceResponse.success(
						"Contact has inactive subscription, skipping journey trigger",
						null,
					);
				}

				// Only create subscription if there's no subscription at all and settings don't ignore subscriptions
				if (!existingSubscription && !shouldIgnoreSubscriptions) {
					await subscriptionsService.create(
						{
							channel: emailChannelId,
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
	}
	// Batch job creation to reduce sequential awaits
	const jobPromises: Promise<void>[] = [];

	for (const step of filtered_steps) {
		if (step.connections_from_this_step?.length) {
			for (const connection_step of step.connections_from_this_step) {
				logger.debug(
					`Creating job for -> connection step ${connection_step.documentId} with target ${connection_step.target_step.documentId}`,
				);
				// Collect all job creation promises
				jobPromises.push(
					createJob({
						contact: contactId,
						journey: step.journey.documentId,
						type: connection_step.target_step.type,
						journey_step: connection_step.target_step.documentId,
						channel: connection_step.target_step.channel?.documentId,
						composition: connection_step.target_step.composition?.documentId,
						timing: connection_step.target_step.timing,
						ignoreSubscription: true,
					}),
				);
			}
		}
	}

	// Execute all job creations in parallel
	if (jobPromises.length > 0) {
		await Promise.allSettled(jobPromises);
		logger.debug(`Created ${jobPromises.length} jobs for contact ${contactId}`);
	}
}
