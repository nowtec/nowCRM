"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Organization } from "@nowcrm/services";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { updateOrganization } from "@/lib/actions/organizations/update-organization";

const formSchema = z.object({
	name: z.string().min(1, "Name is required"),
	email: z
		.preprocess(
			v => (v === "" || v == null ? undefined : v),
			z.string().email().optional(),
		),
	contact_person: z.string().optional(),
	description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditDialogOrganizationGeneralProps {
	organization: Organization;
	isOpen: boolean;
	onClose: () => void;
}

export function EditDialogOrganizationGeneral({
	organization,
	isOpen,
	onClose,
}: EditDialogOrganizationGeneralProps) {
	const router = useRouter();
	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: organization.name,
			email: organization.email ?? "",
			contact_person: organization.contact_person || "",
			description: organization.description || "",
		},
	});

	async function handleSubmit(values: FormValues) {
		const res = await updateOrganization(organization.documentId, values);
		if (!res.success) {
			toast.error(`Error updating organization: ${res.errorMessage}`);
		} else {
			toast.success("Organization updated");
			router.refresh();
			onClose();
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>Edit Organization Information</DialogTitle>
					<DialogDescription>
						Update the basic details of the organization.
					</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(handleSubmit)}
						className="space-y-4"
					>
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel>Name</FormLabel>
									<FormControl>
										<Input {...field} placeholder="Organization Name" />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="email"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel>Email</FormLabel>
									<FormControl>
										<Input
											{...field}
											value={field.value ?? ""}
											placeholder="Email Address"
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="contact_person"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel>Contact Person</FormLabel>
									<FormControl>
										<Input {...field} placeholder="Contact Person" />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="description"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel>Description</FormLabel>
									<FormControl>
										<Input {...field} placeholder="Description" />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<DialogFooter className="pt-4">
							<Button variant="outline" type="button" onClick={onClose}>
								Cancel
							</Button>
							<Button type="submit">Save changes</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
