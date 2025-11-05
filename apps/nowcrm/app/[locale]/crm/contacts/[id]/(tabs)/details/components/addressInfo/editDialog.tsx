"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useMessages } from "next-intl";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
	FaBuilding,
	FaFlag,
	FaHashtag,
	FaHome,
	FaMap,
	FaMapMarkerAlt,
} from "react-icons/fa";
import { z } from "zod";
import { SearchableComboboxDialog } from "@/components/SearchableComboboxDialog";
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
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import cantons from "@/lib/static/cantons.json";
import countries from "@/lib/static/countries.json";
import type { Contact } from "@/lib/types/new_type/contact";

const formSchema = z.object({
	address_line1: z.string().optional(),
	address_line2: z.string().optional(),
	location: z.string().optional(),
	canton: z.string().optional(),
	zip: z.coerce.number().optional(),
	country: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditDialogProps {
	contact: Contact;
	isOpen: boolean;
	onClose: () => void;
}

export function EditDialogAddress({
	contact,
	isOpen,
	onClose,
}: EditDialogProps) {
	const t = useMessages();
	const router = useRouter();
	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			address_line1: contact.address_line1 || "",
			address_line2: contact.address_line2 || "",
			location: contact.location || "",
			canton: contact.canton || "",
			zip: contact.zip || undefined,
			country: contact.country || "",
		},
	});

	const country = form.watch("country");
	useEffect(() => {
		if (country !== "Switzerland") {
			form.setValue("canton", "");
		}
	}, [country]);

	async function handleSubmit(values: FormValues) {
		const { default: toast } = await import("react-hot-toast");
		const { updateContact } = await import(
			"@/lib/actions/contacts/update-contact"
		);

		const finalValues = {
			...values,
			canton: values.country === "Switzerland" ? values.canton : "", // Ignore canton if not CH
			country: values.country || "",
		};
		const res = await updateContact(contact.id, finalValues);
		if (!res.success) {
			toast.error(`${t.Contacts.details.address.error} ${res.errorMessage}`);
		} else {
			toast.success(t.Contacts.details.address.success);
			router.refresh();
			onClose();
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="overflow-visible sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>{t.Contacts.details.address.dialog.title}</DialogTitle>
					<DialogDescription>
						{t.Contacts.details.address.dialog.description}
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(handleSubmit)}
						className="space-y-4"
					>
						{/* Address Line 1 */}
						<FormField
							control={form.control}
							name="address_line1"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel className="flex items-center">
										<FaHome className="mr-2 text-primary" />{" "}
										{t.AdvancedFilters.fields.address_line1}
									</FormLabel>
									<FormControl>
										<Input {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* Address Line 2 */}
						<FormField
							control={form.control}
							name="address_line2"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel className="flex items-center">
										<FaBuilding className="mr-2 text-primary" />{" "}
										{t.AdvancedFilters.fields.address_line2}
									</FormLabel>
									<FormControl>
										<Input {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* Location */}
						<FormField
							control={form.control}
							name="location"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel className="flex items-center">
										<FaMapMarkerAlt className="mr-2 text-primary" />{" "}
										{t.AdvancedFilters.fields.location}
									</FormLabel>
									<FormControl>
										<Input {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<div className="grid grid-cols-2 gap-4">
							{/* Canton */}
							<FormField
								control={form.control}
								name="canton"
								render={({ field }) => (
									<FormItem className="flex flex-col">
										<FormLabel className="flex items-center">
											<TooltipProvider>
												<Tooltip>
													<TooltipTrigger asChild>
														<span className="ml-1 flex cursor-help text-muted-foreground">
															<FaMap className="mr-2 text-primary" />
															{t.AdvancedFilters.fields.canton}
														</span>
													</TooltipTrigger>
													<TooltipContent className="max-w-xs p-2 text-muted-foreground text-xs">
														{t.Contacts.details.address.hintCanton}
													</TooltipContent>
												</Tooltip>
											</TooltipProvider>
										</FormLabel>
										<FormControl>
											<SearchableComboboxDialog
												options={cantons}
												value={field.value ?? ""}
												onChange={field.onChange}
												placeholder={t.AdvancedFilters.placeholders.canton}
												disabled={form.watch("country") !== "Switzerland"}
											/>
										</FormControl>
									</FormItem>
								)}
							/>
							{/* ZIP */}
							<FormField
								control={form.control}
								name="zip"
								render={({ field }) => (
									<FormItem className="flex flex-col">
										<FormLabel className="flex items-center">
											<FaHashtag className="mr-2 text-primary" />{" "}
											{t.AdvancedFilters.fields.zip}
										</FormLabel>
										<FormControl>
											<Input {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						{/* Country */}
						<FormField
							control={form.control}
							name="country"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel className="flex items-center">
										<FaFlag className="mr-2 text-primary" />
										{t.AdvancedFilters.fields.country}
									</FormLabel>
									<FormControl>
										<SearchableComboboxDialog
											options={countries}
											value={field.value ?? ""}
											onChange={field.onChange}
											placeholder={t.AdvancedFilters.placeholders.country}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<DialogFooter className="pt-4">
							<Button variant="outline" type="button" onClick={onClose}>
								{t.common.actions.cancel}
							</Button>
							<Button type="submit">{t.common.actions.saveChanges} </Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
