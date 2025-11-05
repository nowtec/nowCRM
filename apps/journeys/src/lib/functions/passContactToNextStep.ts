import type { DocumentId } from "@nowcrm/services";
import { contactsService } from "@nowcrm/services/server";
import { env } from "@/common/utils/env-config";

export async function passContactToNextStep(
	contactId: DocumentId,
	currentStep: DocumentId,
	journeyId: DocumentId,
	nextStep: DocumentId | null,
): Promise<void> {
	const contactCurrent = await contactsService.findOne(
		contactId,
		env.JOURNEYS_STRAPI_API_TOKEN,
		{
			populate: "*",
		},
	);
	if (!contactCurrent.success || !contactCurrent.data) {
		throw new Error(
			`Failed to fetch contact details ${contactId} : ${contactCurrent.errorMessage}`,
		);
	}

	let journeysUpdated: DocumentId[] = contactCurrent.data.journeys.map(
		(item) => {
			return item.documentId;
		},
	);
	const updatedStepIds: DocumentId[] = contactCurrent.data.journey_steps
		.filter((item) => item.documentId !== currentStep)
		.map((item) => item.documentId);

	if (nextStep) {
		updatedStepIds.push(nextStep);
	} else {
		//last step removing journey id for updating
		journeysUpdated = contactCurrent.data.journeys
			.filter((item) => item.documentId !== journeyId)
			.map((item) => item.documentId);
	}

	const response = await contactsService.update(
		contactId,
		{
			journey_steps: { set: updatedStepIds },
			journeys: { set: journeysUpdated },
		},
		env.JOURNEYS_STRAPI_API_TOKEN,
	);

	if (!response.success) {
		throw new Error(
			`Failed to update contact journey steps: ${response.errorMessage}`,
		);
	}
}
