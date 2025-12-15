// SurveysMassActions.tsx
"use client";

import type { DocumentId } from "@nowcrm/services";
import {
	type ActionsConfig,
	massActionsGenerator,
} from "@/components/generativeComponents/mass-actions-generator";
import { massDeleteSurveys } from "./mass-delete-surveys";

// Define the actions configuration for surveys
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
const SurveysMassActions = massActionsGenerator(actionsConfig);

export default SurveysMassActions;
