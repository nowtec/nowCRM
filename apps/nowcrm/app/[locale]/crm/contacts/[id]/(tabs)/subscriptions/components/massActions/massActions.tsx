// ContactsMassActions.tsx
"use client";

import {
	type ActionsConfig,
	massActionsGenerator,
} from "@/components/generativeComponents/MassActionsGenerator";
import { massActivateSubscriptions } from "./massActivateSubscriptions";
import { massDeactivateSubscriptions } from "./massDeactivateSubscription";
import { massDeleteSubscriptions } from "./massDeleteSubscriptions";
import { DocumentId } from "@nowcrm/services";

// Get your translations/messages

// Define the actions configuration for contacts
const actionsConfig: ActionsConfig = {
	activateSubscriptions: {
		label: "Activate",
		onAction: async (selectedRows: DocumentId[]) => {
			return await massActivateSubscriptions(selectedRows);
		},
		successMessage: "Subscriptions activated",
		errorMessage: "Error activating subscriptions",
	},
	deactivateSubscriptions: {
		label: "Deactivate",
		onAction: async (selectedRows: DocumentId[]) => {
			return await massDeactivateSubscriptions(selectedRows);
		},
		successMessage: "Subscriptions deactivated",
		errorMessage: "Error deactivating subscriptions",
	},
	deleteSubscription: {
		label: "Delete",
		onAction: async (selectedRows: DocumentId[]) => {
			return await massDeleteSubscriptions(selectedRows);
		},
		successMessage: "Subscriptions deleted",
		errorMessage: "Error deleting subscriptions",
	},
};

// Create the MassActions component using the generator
const ContactsSubscriptionsMassActions = massActionsGenerator(actionsConfig);

export default ContactsSubscriptionsMassActions;
