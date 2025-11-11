"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ListPlus, Search } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";
import { GrAddCircle } from "react-icons/gr";
import * as z from "zod";
import { AsyncSelect } from "@/components/autoComplete/AsyncSelect";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createList } from "@/lib/actions/lists/create-list";

const createListSchema = z.object({
	name: z
		.string()
		.min(2, { message: "List name must be at least 2 characters." }),
});

export default function AddToListDialog() {
	const router = useRouter();
	const params = useParams<{ locale: string; id: string }>();

	const [isDialogOpen, setIsDialogOpen] = React.useState(false);
	const [selectedOption, setSelectedOption] = React.useState<any>(null);
	const [listCreated, setListCreated] = React.useState(false);
	const [activeTab, setActiveTab] = React.useState("select");

	const formCreate = useForm<z.infer<typeof createListSchema>>({
		resolver: zodResolver(createListSchema),
		defaultValues: { name: "" },
	});

	React.useEffect(() => {
		if (listCreated && activeTab === "create") {
			setActiveTab("select");
		}
	}, [listCreated, activeTab]);

	async function handleCreate(values: z.infer<typeof createListSchema>) {
		const res = await createList(values.name);
		setSelectedOption({ value: res.data?.documentId, label: res.data?.name });
		setListCreated(true);
	}

	async function handleSubmit() {
		const { default: toast } = await import("react-hot-toast");
		const { addContactToList } = await import(
			"@/lib/actions/lists/add-contact-to-list"
		);

		const res = await addContactToList(
			(params.id),
			selectedOption.value,
		);

		if (!res.success) {
			toast.error("Failed to add contact to the list.");
		} else {
			toast.success(
				`Contact successfully added to list: ${selectedOption.label}`,
			);
			router.refresh();
			setIsDialogOpen(false); // Close dialog after success
			resetForm();
		}
	}

	function resetForm() {
		formCreate.reset();
		setSelectedOption(null);
		setListCreated(false);
		setActiveTab("select");
	}

	return (
		<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
			<DialogTrigger asChild>
				<Button
					size="sm"
					className="ml-2 hidden h-8 lg:flex"
					onClick={() => setIsDialogOpen(true)}
				>
					<GrAddCircle className="mr-2 h-4 w-4" />
					Add to List
				</Button>
			</DialogTrigger>

			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Add Contact to List</DialogTitle>
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
						<Form {...formCreate}>
							<form
								onSubmit={formCreate.handleSubmit(handleCreate)}
								className="space-y-6"
							>
								<FormField
									control={formCreate.control}
									name="name"
									render={({ field }) => (
										<FormItem>
											<FormLabel>List Name</FormLabel>
											<FormControl>
												<Input placeholder="Enter list name..." {...field} />
											</FormControl>
											<FormDescription>
												Choose a name for your new list.
											</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>
								<Button type="submit" className="w-full">
									Create a new List
								</Button>
							</form>
						</Form>
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
