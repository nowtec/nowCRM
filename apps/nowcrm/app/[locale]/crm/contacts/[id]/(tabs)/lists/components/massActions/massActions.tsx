// ContactsMassActions.tsx
"use client";

import {
	type ActionsConfig,
	massActionsGenerator,
} from "@/components/generativeComponents/MassActionsGenerator";
import { MassRemoveLists } from "./massRemoveLists";
import { DocumentId } from "@nowcrm/services";

// Get your translations/messages

// Define the actions configuration for contacts
const actionsConfig: ActionsConfig = {
	deleteContacts: {
		label: "Remove", // e.g., "Delete"
		onAction: async (selectedRows: DocumentId[], contactId: DocumentId) => {
			return await MassRemoveLists(selectedRows, contactId);
		},
		successMessage: "Lists disconnected",
		errorMessage: "Error during disconecting lists",
	},
};

// Create the MassActions component using the generator
const ContactsMassActions = massActionsGenerator(actionsConfig);

export default ContactsMassActions;
