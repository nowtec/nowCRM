import { waitForStrapi } from "../functions/helpers/checkStrapi";
import { startContactsWorkers } from "../workers/contactsWorker";
import { startAddToJourneyWorker } from "./addToJourneyWorker";
import { startAddToListWorker } from "./addToListWorker";
import { startAddToOrganizationWorker } from "./addToOrganizationWorker";
import { startAnonymizeWorker } from "./anonymizeWorker";
import { startDeletionWorker } from "./deletionWorker";
import { startExportWorker } from "./exportWorker";
import { startMassActionsWorker } from "./MassActionsWorker";
import { startOrganizationsWorkers } from "./organizationsWorker";
import { startRelationsWorkers } from "./relationWorker";
import { startOrgRelationsWorkers } from "./relationWorkerOrg";
import { startUpdateSubscriptionWorker } from "./updateSubscriptionWorker";
import { startUpdateWorker } from "./updateWorker";

(async () => {
	try {
		console.log(" Checking if Strapi is ready...");
		await waitForStrapi();
		console.log(" Starting workers...");
		startContactsWorkers();
		startOrganizationsWorkers();
		startDeletionWorker();
		startAddToListWorker();
		startMassActionsWorker();
		startAddToOrganizationWorker();
		startAddToJourneyWorker();
		startRelationsWorkers();
		startAnonymizeWorker();
		startExportWorker();
		startUpdateWorker();
		startUpdateSubscriptionWorker();
		startOrgRelationsWorkers();
	} catch (err) {
		console.error(" Failed to start workers:", err);
		process.exit(1);
	}
})();
