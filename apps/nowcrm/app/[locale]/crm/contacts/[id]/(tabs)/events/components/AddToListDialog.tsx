"use client";

import { ListPlus, Search } from "lucide-react";
import * as React from "react";
import { massAddContactsToList } from "@/app/[locale]/crm/contacts/[id]/(tabs)/events/components/massActions/massAddToList";
import { AsyncSelect } from "@/components/autoComplete/AsyncSelect";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createList } from "@/lib/actions/lists/create-list";
import { StandardResponse } from "@nowcrm/services/server";
import { getContactIdByEventId } from "./massActions/getContactIdByEvent";
import { currentEvents } from "./massActions/massActions";
import { DocumentId } from "@nowcrm/services";

interface AddToListDialogProps {
	selectedContacts: DocumentId[];
	onDone?: (res: StandardResponse<null>) => void;
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
}

export default function AddToListDialog({
	selectedContacts,
	onDone,
	isOpen,
	onOpenChange,
}: AddToListDialogProps) {
	const [selectedOption, setSelectedOption] = React.useState<any>(null);
	const [listCreated, setListCreated] = React.useState(false);
	const [activeTab, setActiveTab] = React.useState("select");
	const [listName, setListName] = React.useState("");

	React.useEffect(() => {
		if (listCreated && activeTab === "create") {
			setActiveTab("select");
		}
	}, [listCreated, activeTab]);

	async function handleCreate() {
		if (listName.trim().length < 2) return;

		const res = await createList(listName.trim());
		if (res.success) {
			setSelectedOption({ value: res.data?.documentId, label: res.data?.name });
			setListCreated(true);
			setListName("");
		}
	}

	async function handleSubmit() {
		if (!selectedOption) return;

		const listId = selectedOption.value;

		// event.id → contact.id
		const contactIds = selectedContacts
			.map((eventId) => getContactIdByEventId(eventId, currentEvents))
			.filter((id): id is DocumentId => Boolean(id));

		const res = await massAddContactsToList(contactIds, listId);

		if (onDone) onDone(res);
		onOpenChange(false);
		resetForm();
	}

	function resetForm() {
		setSelectedOption(null);
		setListCreated(false);
		setActiveTab("select");
		setListName("");
	}

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Add Contacts to List</DialogTitle>
					<DialogDescription>
						Select an existing list or create a new one
					</DialogDescription>
				</DialogHeader>

				<Tabs
					value={activeTab}
					onValueChange={setActiveTab}
					defaultValue="select"
					className="mt-4"
				>
					<TabsList className="grid w-full grid-cols-2">
						<TabsTrigger value="select" className="flex items-center gap-2">
							<Search className="h-4 w-4" />
							Select List
						</TabsTrigger>
						<TabsTrigger value="create" className="flex items-center gap-2">
							<ListPlus className="h-4 w-4" />
							Create New
						</TabsTrigger>
					</TabsList>

					<TabsContent value="select" className="mt-4 space-y-4">
						<AsyncSelect
							serviceName="listService"
							label="List"
							onValueChange={setSelectedOption}
							presetOption={selectedOption}
							useFormClear={false}
						/>
					</TabsContent>

					<TabsContent value="create" className="pt-4">
						<div className="space-y-6">
							<div className="space-y-2">
								<label className="font-medium text-sm">List Name</label>
								<Input
									placeholder="Enter list name..."
									value={listName}
									onChange={(e) => setListName(e.target.value)}
								/>
								<p className="text-muted-foreground text-sm">
									Choose a name for your new list.
								</p>
							</div>
							<Button type="button" className="w-full" onClick={handleCreate}>
								Create a new List
							</Button>
						</div>
					</TabsContent>
				</Tabs>

				{activeTab === "select" && (
					<Button
						onClick={handleSubmit}
						className="mt-6 w-full"
						disabled={!selectedOption}
					>
						<ListPlus className="mr-2 h-4 w-4" />
						Add to Selected List
					</Button>
				)}
			</DialogContent>
		</Dialog>
	);
}
