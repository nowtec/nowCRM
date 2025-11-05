"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import {
	FaCalendarAlt,
	FaEnvelope,
	FaGlobe,
	FaInfoCircle,
	FaMobileAlt,
	FaPhone,
	FaUser,
	FaUserCheck,
	FaUserTie,
	FaVenusMars,
} from "react-icons/fa";
import { z } from "zod";
import { AsyncSelectField } from "@/components/autoComplete/asyncSelectField";
import { DateTimePicker } from "@/components/dateTimePicker";
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
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Contact } from "@/lib/types/new_type/contact";

const handlePhoneInput = (e: React.ChangeEvent<HTMLInputElement>) => {
	const value = e.target.value;
	if (!/^[+0-9-]*$/.test(value)) {
		e.target.value = value.replace(/[^+0-9]/g, "");
	}
};

interface EditDialogProps {
	contact: Contact;
	isOpen: boolean;
	onClose: () => void;
}

export function EditDialog({ contact, isOpen, onClose }: EditDialogProps) {
	const router = useRouter();
	const t = useTranslations();
	const [contactTypeValues, setContactTypeValues] = useState<
		{ value: number; label: string; description?: string }[]
	>([]);

	const contactTypeTooltip = useMemo(() => {
		return contactTypeValues.length > 0 ? (
			<ul className="space-y-1">
				{contactTypeValues.map((type: any) => (
					<li key={type.value}>
						<strong>{type.label}</strong>: {type.description || "—"}
					</li>
				))}
			</ul>
		) : (
			<p>Loading contact types…</p>
		);
	}, [contactTypeValues]);

	useEffect(() => {
		async function fetchContactTypes() {
			const { findData } = await import("@/components/autoComplete/findData");

			try {
				const res = await findData("contactTypeService", {
					pagination: { pageSize: 15 },
				});
				const mapped = (res?.data ?? []).map((item: any) => ({
					value: item.id,
					label: item.name,
					description: item.description,
				}));

				setContactTypeValues(mapped);
			} catch (error) {
				console.error("Failed to fetch contact types:", error);
			}
		}
		fetchContactTypes();
	}, []);

	const formSchema = z.object({
		first_name: z
			.string()
			.min(1, t("Contacts.details.personal.edit.nameSchema")),
		last_name: z.string().optional(),
		email: z
			.string()
			.email(t("Contacts.details.personal.edit.emailSchema"))
			.optional()
			.or(z.literal("")),
		phone: z
			.string()
			.regex(/^[+0-9-]*$/, t("Contacts.details.personal.edit.phoneSchema"))
			.optional(),
		mobile_phone: z
			.string()
			.regex(/^[+0-9-]*$/, t("Contacts.details.personal.edit.mobileSchema"))
			.optional(),
		salutation: z
			.object({
				label: z.string(),
				value: z.number(),
			})
			.optional(),
		title: z
			.object({
				label: z.string(),
				value: z.number(),
			})
			.optional(),
		contact_types: z
			.object({
				label: z.string(),
				value: z.number(),
			})
			.optional(),
		gender: z.string().optional(),
		birth_date: z.date().optional(),
		language: z.string(),
	});

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			first_name: contact.first_name,
			last_name: contact.last_name || "",
			email: contact.email || "",
			contact_types: contact.contact_types?.length
				? {
						label: contact.contact_types[0].name,
						value: contact.contact_types[0].id,
					}
				: undefined,
			phone: contact.phone || "",
			mobile_phone: contact.mobile_phone || "",
			salutation: contact.salutation
				? {
						label: contact.salutation.name,
						value: contact.salutation.id,
					}
				: undefined,
			title: contact.title
				? {
						label: contact.title.name,
						value: contact.title.id,
					}
				: undefined,
			gender: contact.gender || "",
			birth_date: new Date(contact.birth_date) || undefined,
			language: contact.language,
		},
	});

	async function handleSubmit(values: z.infer<typeof formSchema>) {
		const { default: toast } = await import("react-hot-toast");
		const { updateContact } = await import(
			"@/lib/actions/contacts/update-contact"
		);
		const edited_values = {
			...values,
			contact_types: values.contact_types
				? [values.contact_types.value]
				: undefined,
			title: values.title?.value,
			salutation: values.salutation?.value,
		};
		const res = await updateContact(contact.id, edited_values);
		if (!res.success) {
			toast.error(
				`${t("Contacts.details.personal.edit.error")}: ${res.errorMessage}`,
			);
		} else {
			toast.success(
				t("Contacts.details.personal.edit.success", {
					name: values.first_name,
				}),
			);
			router.refresh();
			onClose();
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="h-[95vh] min-w-[50vw] overflow-auto">
				<DialogHeader>
					<DialogTitle>{t("Contacts.details.personal.edit.title")}</DialogTitle>
					<DialogDescription>
						{t("Contacts.details.personal.edit.description")}
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(handleSubmit)}
						className="space-y-4"
					>
						<div className="grid grid-cols-2 gap-4">
							<div className="flex flex-col gap-1">
								<span className="flex items-center">
									<FaUserTie className="mr-2 text-primary" />{" "}
									{t("AdvancedFilters.fields.title")}
								</span>
								<AsyncSelectField
									name="title"
									serviceName="contactTitlesService"
									label=""
									form={form}
									useFormClear={false}
								/>
							</div>
							<div className="flex flex-col gap-1">
								<span className="flex items-center">
									<FaUserCheck className="mr-2 text-primary" />{" "}
									{t("AdvancedFilters.fields.salutation")}
								</span>
								<AsyncSelectField
									name="salutation"
									serviceName="contactSalutationsService"
									label=""
									form={form}
									useFormClear={false}
								/>
							</div>

							<FormField
								control={form.control}
								name="birth_date"
								render={({ field }) => (
									<FormItem className="flex flex-col">
										<FormLabel className="flex items-center">
											<FaCalendarAlt className="mr-2 text-primary" />{" "}
											{t("AdvancedFilters.fields.birth_date")}
										</FormLabel>
										<FormControl>
											<DateTimePicker
												defaultPopupValue={new Date()}
												value={field.value}
												onChange={field.onChange}
												granularity="day"
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="gender"
								render={({ field }) => (
									<FormItem className="flex flex-col">
										<FormLabel className="flex items-center">
											<FaVenusMars className="mr-2 text-primary" />{" "}
											{t("AdvancedFilters.fields.gender")}
										</FormLabel>
										<Select
											onValueChange={field.onChange}
											defaultValue={field.value}
										>
											<FormControl>
												<SelectTrigger>
													<SelectValue
														placeholder={t(
															"AdvancedFilters.placeholders.gender",
														)}
													/>
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												<SelectItem value="Male">
													{t("common.gender.male")}
												</SelectItem>
												<SelectItem value="Female">
													{t("common.gender.female")}
												</SelectItem>
												<SelectItem value="Other">
													{t("common.gender.other")}
												</SelectItem>
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="first_name"
								render={({ field }) => (
									<FormItem className="flex flex-col">
										<FormLabel className="flex items-center">
											<FaUser className="mr-2 text-primary" />{" "}
											{t("AdvancedFilters.fields.first_name")}
										</FormLabel>
										<FormControl>
											<Input {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="last_name"
								render={({ field }) => (
									<FormItem className="flex flex-col">
										<FormLabel className="flex items-center">
											<FaUser className="mr-2 text-primary" />{" "}
											{t("AdvancedFilters.fields.last_name")}
										</FormLabel>
										<FormControl>
											<Input {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<FormField
							control={form.control}
							name="email"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel className="flex items-center">
										<FaEnvelope className="mr-2 text-primary" />{" "}
										{t("AdvancedFilters.fields.email")}
									</FormLabel>
									<FormControl>
										<Input type="email" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="language"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel className="flex items-center">
										<FaGlobe className="mr-2 text-primary" />{" "}
										{t("AdvancedFilters.fields.language")}
									</FormLabel>
									<Select
										onValueChange={field.onChange}
										defaultValue={field.value}
									>
										<FormControl>
											<SelectTrigger>
												<SelectValue
													placeholder={t(
														"AdvancedFilters.placeholders.language",
													)}
												/>
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											<SelectItem value="en">
												{t("common.languages.en")}
											</SelectItem>
											<SelectItem value="fr">
												{t("common.languages.fr")}
											</SelectItem>
											<SelectItem value="de">
												{t("common.languages.de")}
											</SelectItem>
											<SelectItem value="it">
												{t("common.languages.it")}
											</SelectItem>
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="flex flex-col gap-1">
							<div className="flex items-center font-medium text-foreground text-sm">
								<span>{t("AdvancedFilters.fields.contact_types")}</span>
								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger asChild>
											<span className="ml-1 cursor-help text-muted-foreground">
												<FaInfoCircle size={12} />
											</span>
										</TooltipTrigger>
										<TooltipContent className="max-w-xs p-2 text-muted-foreground text-xs">
											{contactTypeTooltip}
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							</div>

							<AsyncSelectField
								name="contact_types"
								label=""
								serviceName="contactTypeService"
								form={form}
								useFormClear={false}
							/>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="phone"
								render={({ field }) => (
									<FormItem className="flex flex-col">
										<FormLabel className="flex items-center">
											<FaPhone className="mr-2 text-primary" />{" "}
											{t("AdvancedFilters.fields.phone")}
										</FormLabel>
										<FormControl>
											<Input {...field} onInput={handlePhoneInput} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="mobile_phone"
								render={({ field }) => (
									<FormItem className="flex flex-col">
										<FormLabel className="flex items-center">
											<FaMobileAlt className="mr-2 text-primary" />{" "}
											{t("AdvancedFilters.fields.mobilePhone")}
										</FormLabel>
										<FormControl>
											<Input {...field} onInput={handlePhoneInput} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<DialogFooter className="pt-4">
							<Button variant="outline" type="button" onClick={onClose}>
								{t("common.actions.cancel")}
							</Button>
							<Button type="submit">{t("common.actions.save")}</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
