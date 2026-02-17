import type { DocumentId, JourneyStep } from "@nowcrm/services";
import { contactsService } from "@nowcrm/services/server";
import { adaptiveRateLimiter } from "@/common/utils/adaptive-rate-limiter";
import { env } from "@/common/utils/env-config";
import { logger } from "@/server";
import { getContact } from "./helpers/get-contact";
import { getJourneyStep } from "./helpers/get-journey-step";

export async function processJob(
	contactId: DocumentId,
	stepId: DocumentId,
	journeyId: DocumentId,
	ignoreSubscription?: boolean,
	stepData?: JourneyStep,
): Promise<void> {
	const contact = await getContact(contactId);
	if (!contact.responseObject) {
		throw new Error(contact.message);
	}
	const contactData = contact.responseObject as NonNullable<
		typeof contact.responseObject
	>;

	// Use provided step data if available, otherwise fetch it
	let step: JourneyStep;
	if (stepData) {
		step = stepData;
	} else {
		const stepResp = await getJourneyStep(stepId);
		if (!stepResp.responseObject) {
			throw new Error(stepResp.message);
		}
		step = stepResp.responseObject;
	}
	const stepDataFinal = step as NonNullable<typeof step>;

	// Only "channel" type steps require channel, composition, and identity
	const stepType = stepDataFinal.type;
	if (stepType !== "channel") {
		throw new Error(
			`processJob should only be called for "channel" type steps, but got "${stepType}"`,
		);
	}

	// Channel is required for "channel" type steps
	if (!stepDataFinal.channel?.name) {
		throw new Error("Channel is missing in step");
	}

	// Composition is required for "channel" type steps
	if (!stepDataFinal.composition?.documentId) {
		throw new Error("Composition is missing in step");
	}

	const channelName = stepDataFinal.channel.name.toLowerCase();
	const isEmailChannel = channelName === "email";

	// Identity is only required when channel type is email
	if (isEmailChannel && !stepDataFinal.identity?.name) {
		throw new Error("Identity is missing in step (required for email channel)");
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
		// checkSubscription doesn't make HTTP requests - it checks locally after fetching settings
		// So we log it as a local operation
		check = (
			await adaptiveRateLimiter.execute(
				() =>
					contactsService.checkSubscription(
						env.JOURNEYS_STRAPI_API_TOKEN,
						contactData,
						stepDataFinal.channel.name,
					),
				`contactsService.checkSubscription (local check for contact ${contactId}, channel: ${stepDataFinal.channel.name})`,
			)
		).data;
	}
	if (check) {
		// Build sendComposition payload - identity only needed for email
		const compositionPayload: any = {
			composition_id: stepDataFinal.composition.documentId,
			channels: [channelName],
			to: contactData.email,
			type: "contact",
			subject: stepDataFinal.composition.subject || stepDataFinal.composition.name,
			ignoreSubscription,
		};

		// Only add "from" (identity) for email channels
		if (isEmailChannel && stepDataFinal.identity?.name) {
			compositionPayload.from = stepDataFinal.identity.name;
		}

		logger.info(
			{
				step: stepId,
				contact: contactId,
				compositino: stepDataFinal.composition.documentId,
			},
			"Composition sent",
		);
		// await adaptiveRateLimiter.execute(() =>
		// 	composerService.sendComposition(compositionPayload, {
		// 		stepId,
		// 		contactId,
		// 		token: env.JOURNEYS_STRAPI_API_TOKEN,
		// 		compositionId: stepDataFinal.composition.documentId,
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
			`contact: ${contactId} doesnt have active subscription for ${stepDataFinal.channel.name}`,
		);
	}
}
