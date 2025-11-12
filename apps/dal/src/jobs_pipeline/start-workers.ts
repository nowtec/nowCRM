import { startAddToJourneyWorker } from "./add-to-journey/add-to-journey-worker";
import { startAddToListWorker } from "./add-to-list/add-to-list-worker";
import { startAddToOrganizationWorker } from "./add-to-organization/add-to-organization-worker";
import { startAnonymizeWorker } from "./anonymize/anonymize-worker";
import { startMassActionsWorker } from "./common/mass-actions/mass-actions-worker";
import { startRelationsWorkers } from "./common/relation/contacts/relation-worker";
import { startOrgRelationsWorkers } from "./common/relation/orgs/relation-worker-org";
import { startContactsWorkers } from "./csv-import/contacts/contacts-worker";
import { waitForStrapi } from "./csv-import/contacts/processors/helpers/check-strapi";
import { startOrganizationsWorkers } from "./csv-import/orgs/organizations-worker";
import { startDeletionWorker } from "./delete/deletion-worker";
import { startExportWorker } from "./export/export-worker";
import { startUpdateWorker } from "./update/update-worker";
import { startUpdateSubscriptionWorker } from "./update-subscription/update-subscription-worker";

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
