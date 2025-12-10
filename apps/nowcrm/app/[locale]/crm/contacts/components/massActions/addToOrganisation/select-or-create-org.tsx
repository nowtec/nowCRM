"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ListPlus, Search } from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { AsyncSelect } from "@/components/autoComplete/async-select";
import { Button } from "@/components/ui/button";
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
import { createOrganization } from "@/lib/actions/organizations/create-organization";

const formSchema = z.object({
	name: z.string().min(2, {
		message: "Organization name must be at least 2 characters.",
	}),
});

export default function SelectOrCreateOrganizationTabs({
	selectedOption,
	setSelectedOption,
	orgCreated,
	setOrgCreated,
}: {
	selectedOption: any;
	setSelectedOption: (value: any) => void;
	orgCreated: boolean;
	setOrgCreated: (value: boolean) => void;
}) {
	const [activeTab, setActiveTab] = React.useState("select");

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: "",
		},
	});

	async function onSubmit(values: z.infer<typeof formSchema>) {
		const res = await createOrganization({
			name: values.name,
			publishedAt: new Date(),
		});
		if (res.data?.id) {
			setSelectedOption({ value: res.data.documentId, label: res.data.name });
			setOrgCreated(true);
			setTimeout(() => setActiveTab("select"), 500);
		}
	}

	React.useEffect(() => {
		if (orgCreated && activeTab === "create") {
			setActiveTab("select");
		}
	}, [orgCreated, activeTab]);

	return (
		<Tabs
			value={activeTab}
			onValueChange={setActiveTab}
			defaultValue="select"
			className="mt-6"
		>
			<TabsList
				className={`grid w-full ${
					orgCreated ? "grid-cols-1 justify-items-center" : "grid-cols-2"
				}`}
			>
				<TabsTrigger
					value="select"
					className={`flex items-center gap-2 ${orgCreated ? "w-[80%]" : ""}`}
				>
					<Search className="h-4 w-4" />
					Select Organization
				</TabsTrigger>
				{!orgCreated && (
					<TabsTrigger value="create" className="flex items-center gap-2">
						<ListPlus className="h-4 w-4" />
						Create New
					</TabsTrigger>
				)}
			</TabsList>

			<TabsContent value="select" className="space-y-4">
				<div className="mt-4">
					<AsyncSelect
						serviceName="organizationsService"
						label="organization"
						onValueChange={setSelectedOption}
						presetOption={selectedOption}
						useFormClear={false}
					/>
				</div>
			</TabsContent>

			{!orgCreated && (
				<TabsContent value="create">
					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(onSubmit)}
							className="space-y-6 py-4"
						>
							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Organization Name</FormLabel>
										<FormControl>
											<Input
												placeholder="Enter organization name..."
												{...field}
											/>
										</FormControl>
										<FormDescription>
											Choose a unique name for your new organization.
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
							<Button type="submit" className="w-full">
								Create Organization
							</Button>
						</form>
					</Form>
				</TabsContent>
			)}
		</Tabs>
	);
}
