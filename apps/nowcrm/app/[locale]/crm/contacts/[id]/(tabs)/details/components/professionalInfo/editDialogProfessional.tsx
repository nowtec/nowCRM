"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import {
	FaBriefcase,
	FaFacebook,
	FaGlobe,
	FaInfoCircle,
	FaLinkedin,
} from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { z } from "zod";
import { AsyncSelectField } from "@/components/autoComplete/asyncSelectField";
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
import { Textarea } from "@/components/ui/textarea";
import type { Contact } from "@/lib/types/new_type/contact";

// Updated Zod schema
const formSchema = z.object({
	function: z.string().optional(),
	organization: z
		.object({
			value: z.number(),
			label: z.string(),
		})
		.optional(),
	department: z
		.object({
			value: z.number(),
			label: z.string(),
		})
		.optional(),
	industry: z
		.object({
			value: z.number(),
			label: z.string(),
		})
		.optional(),
	job_title: z
		.object({
			value: z.number(),
			label: z.string(),
		})
		.optional(),
	website_url: z.string().optional(),
	linkedin_url: z.string().optional(),
	facebook_url: z.string().optional(),
	twitter_url: z.string().optional(),
	description: z.string().optional(),
	job_description: z.string().optional(),
	duration_role: z.string().optional(),
	connection_degree: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditDialogProps {
	contact: Contact;
	isOpen: boolean;
	onClose: () => void;
}

export function EditDialogProfessional({
	contact,
	isOpen,
	onClose,
}: EditDialogProps) {
	const t = useTranslations();
	const router = useRouter();
	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			function: contact.function || "",
			organization: contact.organization
				? { label: contact.organization.name, value: contact.organization.id }
				: undefined,
			department: contact.department
				? { label: contact.department.name, value: contact.department.id }
				: undefined,
			industry: contact.industry
				? { label: contact.industry.name, value: contact.industry.id }
				: undefined,
			job_title: contact.job_title
				? { label: contact.job_title.name, value: contact.job_title.id }
				: undefined,
			website_url: contact.website_url || "",
			linkedin_url: contact.linkedin_url || "",
			facebook_url: contact.facebook_url || "",
			twitter_url: contact.twitter_url || "",
			description: contact.description || "",
			job_description: contact.job_description || "",
			duration_role: contact.duration_role || undefined,
			connection_degree: contact.connection_degree || "",
		},
	});

	async function handleSubmit(values: FormValues) {
		const { default: toast } = await import("react-hot-toast");
		const { updateContact } = await import(
			"@/lib/actions/contacts/update-contact"
		);
		const edited_values = {
			...values,
			organization: values.organization?.value,
			department: values.department?.value,
			industry: values.industry?.value,
			job_title: values.job_title?.value,
		};
		const res = await updateContact(contact.id, edited_values);
		if (!res.success) {
			toast.error(
				`${t("Contacts.details.professional.error")} ${res.errorMessage}`,
			);
		} else {
			toast.success(t("Contacts.details.professional.success"));
			router.refresh();
			onClose();
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>
						{t("Contacts.details.professional.editTitle")}
					</DialogTitle>
					<DialogDescription>
						{t("Contacts.details.professional.descriptionEdit")}
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(handleSubmit)}
						className="space-y-4"
					>
						{/* Function */}
						<FormField
							control={form.control}
							name="function"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel className="flex items-center">
										<FaBriefcase className="mr-2 text-primary" />{" "}
										{t("AdvancedFilters.fields.function")}
									</FormLabel>
									<FormControl>
										<Input
											{...field}
											placeholder={t("AdvancedFilters.placeholders.function")}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<AsyncSelectField
							name="organization"
							label={t("AdvancedFilters.fields.organization")}
							serviceName="organizationService"
							form={form}
							useFormClear={false}
						/>

						{/* Department */}
						<AsyncSelectField
							name="department"
							label={t("AdvancedFilters.fields.department")}
							serviceName="departmentService"
							form={form}
							useFormClear={false}
						/>

						{/* Industry */}
						<AsyncSelectField
							name="industry"
							label={t("AdvancedFilters.fields.industry")}
							serviceName="industryService"
							form={form}
							useFormClear={false}
						/>

						{/* Job Title */}
						<AsyncSelectField
							name="job_title"
							label={t("AdvancedFilters.fields.job_title")}
							serviceName="jobTitleService"
							form={form}
							useFormClear={false}
						/>

						{/* Website URL */}
						<FormField
							control={form.control}
							name="website_url"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel className="flex items-center">
										<FaGlobe className="mr-2 text-primary" />{" "}
										{t("AdvancedFilters.fields.website_url")}
									</FormLabel>
									<FormControl>
										<Input
											{...field}
											placeholder={t(
												"AdvancedFilters.placeholders.website_url",
											)}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* LinkedIn URL */}
						<FormField
							control={form.control}
							name="linkedin_url"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel className="flex items-center">
										<FaLinkedin className="mr-2 text-primary" />{" "}
										{t("AdvancedFilters.fields.linkedin_url")}
									</FormLabel>
									<FormControl>
										<Input
											{...field}
											placeholder={t(
												"AdvancedFilters.placeholders.linkedin_url",
											)}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* Facebook URL */}
						<FormField
							control={form.control}
							name="facebook_url"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel className="flex items-center">
										<FaFacebook className="mr-2 text-primary" />{" "}
										{t("AdvancedFilters.fields.facebook_url")}
									</FormLabel>
									<FormControl>
										<Input
											{...field}
											placeholder={t(
												"AdvancedFilters.placeholders.facebook_url",
											)}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* Twitter URL */}
						<FormField
							control={form.control}
							name="twitter_url"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel className="flex items-center">
										<FaXTwitter className="mr-2 text-primary" />{" "}
										{t("AdvancedFilters.fields.twitter_url")}
									</FormLabel>
									<FormControl>
										<Input
											{...field}
											placeholder={t(
												"AdvancedFilters.placeholders.twitter_url",
											)}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* Job Description */}
						<FormField
							control={form.control}
							name="job_description"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel className="flex items-center">
										<FaInfoCircle className="mr-2 text-primary" />
										{t("AdvancedFilters.fields.job_description")}
									</FormLabel>
									<FormControl>
										<Textarea
											{...field}
											placeholder={t(
												"AdvancedFilters.placeholders.job_description",
											)}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* Duration Role */}
						<FormField
							control={form.control}
							name="duration_role"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel className="flex items-center">
										<FaBriefcase className="mr-2 text-primary" />
										{t("AdvancedFilters.fields.duration_role")}
									</FormLabel>
									<FormControl>
										<Input
											{...field}
											type="number"
											value={field.value ?? ""}
											onChange={(e) =>
												field.onChange(
													e.target.value ? Number(e.target.value) : undefined,
												)
											}
											placeholder={t(
												"AdvancedFilters.placeholders.duration_role",
											)}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* Connection Degree */}
						<FormField
							control={form.control}
							name="connection_degree"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel className="flex items-center">
										<FaBriefcase className="mr-2 text-primary" />
										{t("AdvancedFilters.fields.connection_degree")}
									</FormLabel>
									<FormControl>
										<Input
											{...field}
											placeholder={t(
												"AdvancedFilters.placeholders.connection_degree",
											)}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* Description */}
						<FormField
							control={form.control}
							name="description"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel className="flex items-center">
										<FaInfoCircle className="mr-2 text-primary" />
										{t("AdvancedFilters.fields.description")}
									</FormLabel>
									<FormControl>
										<Textarea
											{...field}
											placeholder={t(
												"AdvancedFilters.placeholders.description",
											)}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<DialogFooter className="pt-4">
							<Button variant="outline" type="button" onClick={onClose}>
								{t("common.actions.cancel")}
							</Button>
							<Button type="submit">{t("common.actions.saveChanges")}</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
