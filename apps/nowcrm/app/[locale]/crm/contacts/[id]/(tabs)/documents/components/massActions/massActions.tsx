// ContactsMassActions.tsx
"use client";

import {
	type ActionsConfig,
	massActionsGenerator,
} from "@/components/generativeComponents/MassActionsGenerator";
import { massDeleteDocuments } from "./massDeleteDocuments";
import { DocumentId } from "@nowcrm/services";

// Define the actions configuration for contacts
const actionsConfig: ActionsConfig = {
	deleteContacts: {
		label: "Delete",
		onAction: async (selectedRows: DocumentId[]) => {
			return await massDeleteDocuments(selectedRows);
		},
		successMessage: "Documents deleted",
		errorMessage: "Error during deleting documents",
	},
};

// Create the MassActions component using the generator
const DocumnetsMassActions = massActionsGenerator(actionsConfig);

export default DocumnetsMassActions;
