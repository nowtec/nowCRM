// ContactsMassActions.tsx
"use client";

import {
	type ActionsConfig,
	massActionsGenerator,
} from "@/components/generativeComponents/MassActionsGenerator";
import { massDeleteDonationSubscriptions } from "./massDeleteTransactions";
import { DocumentId } from "@nowcrm/services";

// Get your translations/messages

// Define the actions configuration for contacts
const actionsConfig: ActionsConfig = {
	deleteContacts: {
		label: "Delete",
		onAction: async (selectedRows: DocumentId[]) => {
			return await massDeleteDonationSubscriptions(selectedRows);
		},
		successMessage: "Donation subscription deleted",
		errorMessage: "Error deleting donation subscription",
	},
};

// Create the MassActions component using the generator
const DonationSubscriptionsMassActions = massActionsGenerator(actionsConfig);

export default DonationSubscriptionsMassActions;
