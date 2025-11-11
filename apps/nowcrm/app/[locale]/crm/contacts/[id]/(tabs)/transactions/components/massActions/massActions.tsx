// ContactsMassActions.tsx
"use client";

import {
	type ActionsConfig,
	massActionsGenerator,
} from "@/components/generativeComponents/MassActionsGenerator";
import { massDeleteTransactions } from "./massDeleteTransactions";
import { DocumentId } from "@nowcrm/services";
// Get your translations/messages

// Define the actions configuration for contacts
const actionsConfig: ActionsConfig = {
	deleteContacts: {
		label: "Delete",
		onAction: async (selectedRows: DocumentId[]) => {
			return await massDeleteTransactions(selectedRows);
		},
		successMessage: "Transactions deleted",
		errorMessage: "Error deleting transcations",
	},
};

// Create the MassActions component using the generator
const ContactsSubscriptionsMassActions = massActionsGenerator(actionsConfig);

export default ContactsSubscriptionsMassActions;
