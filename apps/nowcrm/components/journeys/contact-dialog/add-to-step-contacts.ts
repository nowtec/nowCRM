// actions/deleteContactAction.ts
"use server";
import {
	type Contact,
	checkDocumentId,
	type DocumentId,
	type StandardResponse,
} from "@nowcrm/services";
import {
	contactsService,
	journeyStepsService,
	journeysService,
} from "@nowcrm/services/server";
import { auth } from "@/auth";
import type { addContactsToStepData } from "./add-contacts-dialog";

async function propagateContactsToJourney(
	stepId: DocumentId,
	contactIds: DocumentId[],
) {
	const session = await auth();
	if (!session) {
		return {
			data: null,
			status: 403,
			success: false,
		};
	}
	const step = await journeyStepsService.findOne(stepId, session.jwt, {
		populate: {
			journey: {
				populate: {
					contacts: true,
				},
			},
		},
	});

	if (!step?.data?.journey?.documentId) return;

	const journeyId = step.data.journey.documentId;
	const existingContacts =
		step.data.journey.contacts?.map((c: Contact) => c.documentId) || [];
	const allJourneyContacts = Array.from(
		new Set([...existingContacts, ...contactIds]),
	);

	await journeysService.update(
		journeyId,
		{
			contacts: { connect: allJourneyContacts },
		},
		session.jwt,
	);
	return {
		data: true,
		status: 200,
		success: true,
		errorMessage: "",
	};
}

export async function addToStepAction(
	data: addContactsToStepData,
): Promise<StandardResponse<boolean>> {
	const session = await auth();
	if (!session) {
		return {
			data: null,
			status: 403,
			success: false,
		};
	}
	try {
		if (data.type === "list" && checkDocumentId(data.contacts)) {
			const all_contacts = await contactsService.findAll(session.jwt, {
				filters: { lists: { documentId: { $in: data.contacts } } },
				populate: {
					subscriptions: {
						populate: {
							channel: true,
						},
					},
				},
			});
			if (!all_contacts.data || !all_contacts.meta) {
				return {
					data: null,
					status: 400,
					success: false,
					errorMessage: "Probably strapi is down",
				};
			}

			const list_ids = all_contacts.data.map((contact) => contact.documentId);

			await journeyStepsService.update(
				data.step_id,
				{
					contacts: { connect: list_ids },
				},
				session.jwt,
			);
			await propagateContactsToJourney(data.step_id, list_ids);
			return {
				data: true,
				status: 200,
				success: true,
				errorMessage: "",
			};
		}

		if (data.type === "organization" && checkDocumentId(data.contacts)) {

			const all_contacts = await contactsService.find(session.jwt, {
				filters: { organization: { documentId: { $eq: data.contacts } } },
				populate: {
					subscriptions: {
						populate: {
							channel: true,
						},
					},
				},
			});

			if (!all_contacts.data || !all_contacts.meta) {
				return {
					data: null,
					status: 400,
					success: false,
					errorMessage: "Probably strapi is down",
				};
			}
			const org_ids = all_contacts.data.map((contact) => contact.documentId);

			await journeyStepsService.update(
				data.step_id,
				{
					contacts: { connect: org_ids },
				},
				session.jwt,
			);
			await propagateContactsToJourney(data.step_id, org_ids);
			return {
				data: true,
				status: 200,
				success: true,
				errorMessage: "",
			};
		}

		if (data.type === "contact" && checkDocumentId(data.contacts)) {
			await journeyStepsService.update(
				data.step_id,
				{
					contacts: { connect: [data.contacts] },
				},
				session.jwt,
			);
			await propagateContactsToJourney(data.step_id, [data.contacts]);
			return {
				data: true,
				status: 200,
				success: true,
				errorMessage: "",
			};
		}
		return {
			data: null,
			status: 400,
			success: false,
			errorMessage: "Probably strapi is down",
		};
	} catch (_error: any) {
		return {
			data: null,
			status: 400,
			success: false,
			errorMessage: "error",
		};
	}
}
