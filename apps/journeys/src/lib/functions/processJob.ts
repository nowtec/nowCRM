import type { DocumentId } from "@nowcrm/services";
import { compositionsService, contactsService } from "@nowcrm/services/server";
import { env } from "@/common/utils/env-config";
import { logger } from "@/server";
import { getContact } from "./helpers/getContact";
import { getJourney } from "./helpers/getJourney";
import { getJourneyStep } from "./helpers/getJourneyStep";

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
	const step = await getJourneyStep(stepId);
	if (!step.responseObject) {
		throw new Error(step.message);
	}
	if (!step.responseObject.channel?.name) {
		throw new Error("Channel is missing in step");
	}

	const journey = await getJourney(journeyId);
	if (!journey.responseObject) {
		throw new Error(journey.message);
	}

	logger.info(`contact: ${contact} step: ${step} journey: ${journey}`);
	let check: boolean | null = true;
	if (!ignoreSubscription) {
		check = (
			await contactsService.checkSubscription(
				env.JOURNEYS_STRAPI_API_TOKEN,
				contact.responseObject,
				step.responseObject.channel.name,
			)
		).data;
	}
	if (check) {
		await compositionsService.sendComposition(
			env.JOURNEYS_STRAPI_API_TOKEN,
			step.responseObject,
			contact.responseObject,
			"contact",
			ignoreSubscription,
		);
	} else {
		logger.warn(`contact: ${contactId} doesnt have active subscription`);
		throw new Error(
			`contact: ${contactId} doesnt have active subscription for ${step.responseObject.channel.name}`,
		);
	}
}
