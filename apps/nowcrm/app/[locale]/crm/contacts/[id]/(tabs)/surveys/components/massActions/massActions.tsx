// ContactsMassActions.tsx
"use client";

import {
	type ActionsConfig,
	massActionsGenerator,
} from "@/components/generativeComponents/MassActionsGenerator";
import { massDeleteSurveys } from "./massDeleteSurveys";
import { DocumentId } from "@nowcrm/services";

// Get your translations/messages

// Define the actions configuration for contacts
const actionsConfig: ActionsConfig = {
	deleteContacts: {
		label: "Delete",
		onAction: async (selectedRows: DocumentId[]) => {
			return await massDeleteSurveys(selectedRows);
		},
		successMessage: "Surveys deleted",
		errorMessage: "Error deleting surveys",
	},
};

// Create the MassActions component using the generator
const ContactsSubscriptionsMassActions = massActionsGenerator(actionsConfig);

export default ContactsSubscriptionsMassActions;
