"use client";

import React from "react";
import {
	type ActionsConfig,
	type MassActionsComponentProps,
	massActionsGenerator,
} from "@/components/generativeComponents/MassActionsGenerator";
import AddToListDialog from "../AddToListDialog";
import { getContactIdByEventId } from "./getContactIdByEvent";
import { massDeleteEvents } from "./massDeleteEvents";
import { massUnsubscribeContacts } from "./massUnsubscribe";
import { DocumentId } from "@nowcrm/services";

export let currentEvents: any[] = [];
export function setEventsForMassActions(events: any[]) {
	currentEvents = events;
}

const actionsConfig: ActionsConfig = {
	deleteContacts: {
		label: "Delete Events",
		onAction: async (selectedRows: DocumentId[]) => {
			const res = await massDeleteEvents(selectedRows);
			return res;
		},
		successMessage: "Events deleted",
		errorMessage: "Error during deleting events",
	},
	unsubscribeContacts: {
		label: "Unsubscribe contacts",
		onAction: async (selectedRows: DocumentId[]) => {
			const contactIds = selectedRows
				.map((eventId) => getContactIdByEventId(eventId, currentEvents))
				.filter((id): id is DocumentId => Boolean(id));

			return massUnsubscribeContacts(contactIds);
		},
		successMessage: "Contacts unsubscribed",
		errorMessage: "Error during unsubscribing contacts",
	},
};

interface ContactsSubscriptionsMassActionsProps
	extends MassActionsComponentProps {}

const ContactsSubscriptionsMassActions = ({
	selectedRows,
	clearFunction,
	dropdownModal,
	refreshData,
	...restProps
}: ContactsSubscriptionsMassActionsProps) => {
	const [dialogOpen, setDialogOpen] = React.useState(false);
	const [selected, setSelected] = React.useState<DocumentId[]>([]);
	const [resolver, setResolver] = React.useState<((res: any) => void) | null>(
		null,
	);

	const actionsWithDialog: ActionsConfig = {
		...actionsConfig,
		addContactsToList: {
			label: "Add contacts to list",
			onAction: async (selectedRows: DocumentId[]) => {
				setSelected(selectedRows);
				setDialogOpen(true);
				return new Promise((resolve) => setResolver(() => resolve));
			},
			successMessage: "Contacts added to list",
			errorMessage: "Error during adding contacts to list",
		},
	};

	const MassActionsWithDialog = massActionsGenerator(actionsWithDialog);

	return (
		<>
			<MassActionsWithDialog
				selectedRows={selectedRows}
				clearFunction={clearFunction}
				dropdownModal={dropdownModal}
				refreshData={refreshData}
				{...restProps}
			/>

			<AddToListDialog
				selectedContacts={selected}
				isOpen={dialogOpen}
				onOpenChange={setDialogOpen}
				onDone={(res) => {
					if (resolver) resolver(res);
				}}
			/>
		</>
	);
};

export default ContactsSubscriptionsMassActions;
