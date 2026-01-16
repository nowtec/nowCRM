"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import * as React from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { AsyncSelect } from "@/components/autoComplete/async-select";
import { DateTimePicker } from "@/components/date-time-picker";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import countriesData from "@/lib/static/countries.json";

export const contactCSVTemplateFields = [
	"email",
	"first_name",
	"last_name",
	"address_line1",
	"address_line2",
	"zip",
	"location",
	"canton",
	"country",
	"language",
	"function",
	"phone",
	"mobile_phone",
	"salutation",
	"gender",
	"website_url",
	"linkedin_url",
	"facebook_url",
	"twitter_url",
	"birth_date",
	"organization",
	"department",
	"description",
	"contact_interests",
	"priority",
	"status",
	"tags",
	"keywords",
	"last_access",
	"account_created_at",
	"ranks",
	"contact_types",
	"sources",
	"contact_notes",
	"industry",
	"title",
	"connection_degree",
	"duration_role",
	"job_description",
	"job_title",
] as const;

export const allowedEnumerations: Record<string, string[]> = {
	priority: ["p1", "p2", "p3", "p4", "p5"],
	status: [
		"new",
		"closed",
		"contacted",
		"negotiating",
		"registered",
		"backfill",
		"customer/no marketing",
		"prospect/marketing",
	],
	gender: ["Male", "Female", "other"],
	language: ["English", "Deutsch", "Italiano", "Français"],
};

const formSchema = z.object({
	field: z.string().min(1, { message: "Please select a field to update." }),
	value: z.string().min(1, { message: "Please enter a value." }),
});

export type UpdateContactFieldFormValues = z.infer<typeof formSchema>;

export function UpdateContactFieldForm({
	selectedOption,
	setSelectedOption,
	onSubmitted,
}: {
	selectedOption: { field?: string; value?: string; label?: string } | null;
	setSelectedOption: (value: {
		field: string;
		value: string;
		label: string;
	}) => void;
	onSubmitted?: (values: UpdateContactFieldFormValues) => void;
}) {
	const form = useForm<UpdateContactFieldFormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			field: selectedOption?.field || "",
			value: selectedOption?.value || "",
		},
	});

	function onSubmit(values: UpdateContactFieldFormValues) {
		setSelectedOption({
			field: values.field,
			value: values.value,
			label: `${values.field}: ${values.value}`,
		});
		// onSubmitted?.(values);
	}

	const handleFieldChange = (fieldValue: string) => {
		form.setValue("value", "");
		setSelectedOption({
			field: fieldValue,
			value: "",
			label: `${fieldValue}:`,
		});
	};

	const handleValueChange = (valueInput: string) => {
		const currentField = form.getValues("field");
		if (currentField && valueInput) {
			setSelectedOption({
				field: currentField,
				value: valueInput,
				label: `${currentField}: ${valueInput}`,
			});
		}
	};

	const currentField = form.watch("field");
	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
				<FormField
					control={form.control}
					name="field"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Field to Update</FormLabel>
							<Select
								value={field.value}
								onValueChange={(value) => {
									field.onChange(value);
									handleFieldChange(value);
								}}
							>
								<FormControl>
									<SelectTrigger>
										<SelectValue placeholder="Select a field to update" />
									</SelectTrigger>
								</FormControl>
								<SelectContent>
									{contactCSVTemplateFields.map((fieldName) => (
										<SelectItem key={fieldName} value={fieldName}>
											{fieldName
												.replace(/_/g, " ")
												.replace(/\b\w/g, (l) => l.toUpperCase())}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<FormDescription>
								Choose which contact field you want to update.
							</FormDescription>
							<FormMessage />
						</FormItem>
					)}
				/>
				{currentField === "title" ? (
					<AsyncSelect
						serviceName="contactTitlesService"
						label=""
						onValueChange={(opt) =>
							setSelectedOption({
								field: "title",
								value: opt.label,
								label: `title: ${opt.label}`,
							})
						}
						useFormClear={false}
					/>
				) : currentField === "salutation" ? (
					<AsyncSelect
						serviceName="contactSalutationsService"
						label=""
						onValueChange={(opt) =>
							setSelectedOption({
								field: "salutation",
								value: opt.label,
								label: `salutation: ${opt.label}`,
							})
						}
						useFormClear={false}
					/>
				) : currentField === "job_title" ? (
					<AsyncSelect
						serviceName="contactJobTitlesService"
						label=""
						onValueChange={(opt) =>
							setSelectedOption({
								field: "job_title",
								value: opt.label,
								label: `job_title: ${opt.label}`,
							})
						}
						useFormClear={false}
					/>
				) : currentField === "industry" ? (
					<AsyncSelect
						serviceName="industriesService"
						label=""
						onValueChange={(opt) =>
							setSelectedOption({
								field: "industry",
								value: opt.label,
								label: `industry: ${opt.label}`,
							})
						}
						useFormClear={false}
					/>
				) : currentField === "tags" ? (
					<AsyncSelect
						serviceName="tagsService"
						label=""
						onValueChange={(opt) =>
							setSelectedOption({
								field: "tags",
								value: opt.label,
								label: `tags: ${opt.label}`,
							})
						}
						useFormClear={false}
					/>
				) : (
					<FormField
						control={form.control}
						name="value"
						render={({ field }) => {
							const enumOptions = allowedEnumerations[currentField];
							const isDateField = [
								"birth_date",
								"last_access",
								"account_created_at",
							].includes(currentField);
							const isCountryField = currentField === "country";
							const isCustomField = field.value.startsWith("custom:");
							return (
								<FormItem>
									<FormLabel>New Value</FormLabel>
									<FormControl>
										{isCountryField ? (
											<Select
												onValueChange={(val) => {
													field.onChange(val);
													handleValueChange(val);
												}}
												value={field.value}
											>
												<SelectTrigger>
													<SelectValue placeholder="Select country" />
												</SelectTrigger>
												<SelectContent>
													{countriesData.map((country) => {
														const displayValue = `${country.name} (${country.code})`;
														return (
															<SelectItem
																key={country.code}
																value={displayValue}
															>
																{displayValue}
															</SelectItem>
														);
													})}
												</SelectContent>
											</Select>
										) : enumOptions ? (
											<>
												<Select
													onValueChange={(val) => {
														if (
															currentField === "language" &&
															val === "custom"
														) {
															field.onChange("custom:");
														} else {
															field.onChange(val);
															handleValueChange(val);
														}
													}}
													value={isCustomField ? "custom" : field.value}
												>
													<SelectTrigger>
														<SelectValue placeholder="Select value" />
													</SelectTrigger>
													<SelectContent>
														{enumOptions.map((opt) => (
															<SelectItem key={opt} value={opt}>
																{opt}
															</SelectItem>
														))}
														{currentField === "language" && (
															<SelectItem value="custom">Custom…</SelectItem>
														)}
													</SelectContent>
												</Select>
												{isCustomField && (
													<Input
														placeholder="Enter custom value..."
														value={field.value.replace("custom:", "")}
														onChange={(e) => {
															const customValue = `custom:${e.target.value}`;
															field.onChange(customValue);
															handleValueChange(
																customValue.replace("custom:", ""),
															);
														}}
													/>
												)}
											</>
										) : isDateField ? (
											<DateTimePicker
												value={field.value ? new Date(field.value) : undefined}
												onChange={(date) => {
													let newValue = "";
													if (date) {
														if (currentField === "birth_date") {
															newValue = format(date, "yyyy-MM-dd");
														} else {
															newValue = date.toISOString();
														}
													}
													field.onChange(newValue);
													handleValueChange(newValue);
												}}
												granularity={
													currentField === "birth_date" ? "day" : "second"
												}
												hourCycle={24}
											/>
										) : (
											<Input
												placeholder="Enter the new value..."
												value={field.value}
												onChange={(e) => {
													let value = e.target.value;
													if (currentField === "zip") {
														value = value.replace(/[^0-9]/g, "");
													} else if (
														currentField === "phone" ||
														currentField === "mobile_phone"
													) {
														value = value.replace(/[^0-9+]/g, "");
													}
													field.onChange(value);
													handleValueChange(value);
												}}
											/>
										)}
									</FormControl>
									<FormDescription>
										This value will be applied to all selected contacts.
									</FormDescription>
									<FormMessage />
								</FormItem>
							);
						}}
					/>
				)}
			</form>
		</Form>
	);
}
