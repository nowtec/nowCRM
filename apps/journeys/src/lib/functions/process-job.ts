import type { DocumentId } from "@nowcrm/services";
import { composerService, contactsService } from "@nowcrm/services/server";
import { adaptiveRateLimiter } from "@/common/utils/adaptive-rate-limiter";
import { env } from "@/common/utils/env-config";
import { logger } from "@/server";
import { getContact } from "./helpers/get-contact";
import { getJourney } from "./helpers/get-jouney";
import { getJourneyStep } from "./helpers/get-journey-step";

export async function processJob(
	contactId: DocumentId,
	stepId: DocumentId,
	journeyId: DocumentId,
	ignoreSubscription?: boolean,
): Promise<void> {
	const contact = await getContact(contactId);
	if (!contact.responseObject) {
		throw new Error(contact.message);
	}
	const contactData = contact.responseObject as NonNullable<
		typeof contact.responseObject
	>;

	const step = await getJourneyStep(stepId);
	if (!step.responseObject) {
		throw new Error(step.message);
	}
	const stepData = step.responseObject as NonNullable<
		typeof step.responseObject
	>;

	// Only "channel" type steps require channel, composition, and identity
	const stepType = stepData.type;
	if (stepType !== "channel") {
		throw new Error(
			`processJob should only be called for "channel" type steps, but got "${stepType}"`,
		);
	}

	// Channel is required for "channel" type steps
	if (!stepData.channel?.name) {
		throw new Error("Channel is missing in step");
	}

	// Composition is required for "channel" type steps
	if (!stepData.composition?.documentId) {
		throw new Error("Composition is missing in step");
	}

	const channelName = stepData.channel.name.toLowerCase();
	const isEmailChannel = channelName === "email";

	// Identity is only required when channel type is email
	if (isEmailChannel && !stepData.identity?.name) {
		throw new Error("Identity is missing in step (required for email channel)");
	}

	const journey = await getJourney(journeyId);
	if (!journey.responseObject) {
		throw new Error(journey.message);
	}

	logger.debug(
		{
			contactId,
			stepId,
			journeyId,
			stepType,
			channelName,
			isEmailChannel,
		},
		"Processing channel step job",
	);

	let check: boolean | null = true;
	if (!ignoreSubscription) {
		check = (
			await adaptiveRateLimiter.execute(() =>
				contactsService.checkSubscription(
					env.JOURNEYS_STRAPI_API_TOKEN,
					contactData,
					stepData.channel.name,
				),
			)
		).data;
	}
	if (check) {
		// Build sendComposition payload - identity only needed for email
		const compositionPayload: any = {
			composition_id: stepData.composition.documentId,
			channels: [channelName],
			to: contactData.email,
			type: "contact",
			subject: stepData.composition.subject || stepData.composition.name,
			ignoreSubscription,
		};

		// Only add "from" (identity) for email channels
		if (isEmailChannel && stepData.identity?.name) {
			compositionPayload.from = stepData.identity.name;
		}

		logger.info({
			step: stepId,
			contact: contactId,
			compositino :stepData.composition.documentId
		},"Composition sent")
		// await adaptiveRateLimiter.execute(() =>
		// 	composerService.sendComposition(compositionPayload, {
		// 		stepId,
		// 		contactId,
		// 		token: env.JOURNEYS_STRAPI_API_TOKEN,
		// 		compositionId: stepData.composition.documentId,
		// 	}),
		// );
	} else {
		logger.warn(
			{
				contactId,
				channelName,
			},
			"Contact doesn't have active subscription",
		);
		throw new Error(
			`contact: ${contactId} doesnt have active subscription for ${stepData.channel.name}`,
		);
	}
}
