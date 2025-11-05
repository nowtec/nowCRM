import { createBullBoard } from "@bull-board/api";
import { ExpressAdapter } from "@bull-board/express";
import { addToListQueue } from "@/lib/queues/addToListQueue";
import { addToOrganizationQueue } from "@/lib/queues/addToOrganizationQueue";
import { anonymizeQueue } from "@/lib/queues/anonymizeQueue";
import { csvMassActionsQueue } from "@/lib/queues/csvMassActionsQueue";
import { deletionQueue } from "@/lib/queues/deletionQueue";
import { exportQueue } from "@/lib/queues/exportQueue";
import { organizationsQueue } from "@/lib/queues/organizationsQueue";
import { relationsQueue } from "@/lib/queues/relationsQueue";
import { addToJourneyQueue } from "../lib/queues/addToJourneyQueue";
import { contactsQueue } from "../lib/queues/contactsQueue";
import { csvContactsQueue } from "../lib/queues/csvContactsQueue";
import { csvOrganizationsQueue } from "../lib/queues/csvOrganizationsQueue";
import { orgRelationsQueue } from "../lib/queues/relationsQueueOrg";
import { updateQueue } from "../lib/queues/updateQueue";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";

export const serverAdapter: ExpressAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

export const bullBoard = createBullBoard({
	queues: [new BullMQAdapter(csvContactsQueue),
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
		new BullMQAdapter(updateQueue),],
	serverAdapter,
});
