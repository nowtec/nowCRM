import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { addToListQueue } from "@/jobs_pipeline/add-to-list/add-to-list-queue";
import { addToOrganizationQueue } from "@/jobs_pipeline/add-to-organization/add-to-organization-queue";
import { anonymizeQueue } from "@/jobs_pipeline/anonymize/anonymize-queue";
import { csvMassActionsQueue } from "@/jobs_pipeline/common/mass-actions/csv-mass-actions-queue";
import { relationsQueue } from "@/jobs_pipeline/common/relation/contacts/relations-queue";
import { organizationsQueue } from "@/jobs_pipeline/csv-import/orgs/organizations-queue";
import { deletionQueue } from "@/jobs_pipeline/delete/deletion-queue";
import { exportQueue } from "@/jobs_pipeline/export/export-queue";
import { addToJourneyQueue } from "../jobs_pipeline/add-to-journey/add-to-journey-queue";
import { orgRelationsQueue } from "../jobs_pipeline/common/relation/orgs/relations-queue-org";
import { contactsQueue } from "../jobs_pipeline/csv-import/contacts/contacts-queue";
import { csvContactsQueue } from "../jobs_pipeline/csv-import/contacts/csv-contacts-queue";
import { csvOrganizationsQueue } from "../jobs_pipeline/csv-import/orgs/csv-organizations-queue";
import { updateQueue } from "../jobs_pipeline/update/update-queue";

export const serverAdapter: ExpressAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

export const bullBoard = createBullBoard({
	queues: [
		new BullMQAdapter(csvContactsQueue),
		new BullMQAdapter(contactsQueue),
		new BullMQAdapter(csvOrganizationsQueue),
		new BullMQAdapter(organizationsQueue),
		new BullMQAdapter(csvMassActionsQueue),
		new BullMQAdapter(deletionQueue),
		new BullMQAdapter(addToListQueue),
		new BullMQAdapter(addToOrganizationQueue),
		new BullMQAdapter(addToJourneyQueue),
		new BullMQAdapter(relationsQueue),
		new BullMQAdapter(orgRelationsQueue),
		new BullMQAdapter(exportQueue),
		new BullMQAdapter(anonymizeQueue),
		new BullMQAdapter(updateQueue),
	],
	serverAdapter,
});
