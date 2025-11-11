"use client";

import { format } from "date-fns";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { type UseFormReturn, useWatch } from "react-hook-form";
import { AsyncSelectField } from "@/components/autoComplete/asyncSelectField";
// Import types and utilities from the base component
import { DateTimePicker } from "@/components/dateTimePicker";
import { SearchableComboboxDialog } from "@/components/SearchableComboboxDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { BaseServiceName } from "@nowcrm/services";
import cantons from "@/lib/static/cantons.json";
import countries from "@/lib/static/countries.json";
import type { FilterValues } from "./advancedFilters";
import { getOperatorsForField } from "./filtersShared";
import { FIELD_TYPES, RELATION_META } from "./filterTypes";

const FilterField = ({
	fieldName,
	value,
	operator,
	onValueChange,
	onOperatorChange,
	onRemove,
	form,
	groupIndex,
}: {
	fieldName: string;
	value: any;
	operator: string;
	onValueChange: (value: any) => void;
	onOperatorChange: (operator: string) => void;
	onRemove: () => void;
	form: UseFormReturn<FilterValues>;
	groupIndex: number;
}) => {
	const t = useTranslations();
	const fieldType = FIELD_TYPES[fieldName] || "text";
	const operators = getOperatorsForField(fieldName);
	const isNullOperator = operator === "$null" || operator === "$notNull";

	const relationMeta = RELATION_META[fieldName];
	const relationPath = `groups.${groupIndex}.filters.${fieldName}` as const;

	const surveyId = useWatch({
		control: form.control,
		name: `groups.${groupIndex}.filters.surveys.value` as const,
	});
	const questionId = useWatch({
		control: form.control,
		name: `groups.${groupIndex}.filters.survey_items_question.value` as const,
	});

	return (
		<div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3">
			<div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
				<div className="min-w-[120px] flex-shrink-0 font-medium text-sm">
					{fieldName
						.replace(/_/g, " ")
						.replace(/\b\w/g, (l) => l.toUpperCase())}
				</div>

				{fieldType !== "relation" && (
					<div className="min-w-[100px] flex-shrink-0">
						<Select value={operator} onValueChange={onOperatorChange}>
							<SelectTrigger className="h-8">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{operators.map((op) => (
									<SelectItem key={op.value} value={op.value}>
										{op.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				)}

				<div className="min-w-[150px] flex-1">
					{!isNullOperator &&
						(fieldType === "date" ? (
							<DateTimePicker
								granularity="day"
								value={value ? new Date(value) : undefined}
								onChange={(date) =>
									onValueChange(date ? format(date, "yyyy-MM-dd") : "")
								}
							/>
						) : fieldType === "enum" && fieldName === "language" ? (
							<Select value={value || ""} onValueChange={onValueChange}>
								<SelectTrigger className="h-8">
									<SelectValue placeholder="Select..." />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="en">English</SelectItem>
									<SelectItem value="de">German</SelectItem>
									<SelectItem value="fr">French</SelectItem>
									<SelectItem value="it">Italian</SelectItem>
								</SelectContent>
							</Select>
						) : fieldType === "text" && fieldName === "country" ? (
							<SearchableComboboxDialog
								options={countries}
								value={value ?? ""}
								onChange={onValueChange}
								placeholder={t("AdvancedFilters.placeholders.country")}
							/>
						) : fieldType === "text" && fieldName === "canton" ? (
							<SearchableComboboxDialog
								options={cantons}
								value={value ?? ""}
								onChange={onValueChange}
								placeholder={t("AdvancedFilters.placeholders.canton")}
							/>
						) : fieldName === "organization" ? (
							<AsyncSelectField
								form={form}
								name={relationPath}
								serviceName="organizationsService"
								useFormClear
								filterKey="name"
							/>
						) : fieldName === "organization_createdAt" ? (
							<DateTimePicker
								granularity="day"
								value={value ? new Date(value) : undefined}
								onChange={(date) =>
									onValueChange(date ? format(date, "yyyy-MM-dd") : "")
								}
							/>
						) : fieldName === "organization_updatedAt" ? (
							<DateTimePicker
								granularity="day"
								value={value ? new Date(value) : undefined}
								onChange={(date) =>
									onValueChange(date ? format(date, "yyyy-MM-dd") : "")
								}
							/>
						) : fieldType === "enum" && fieldName === "status" ? (
							<Select value={value || ""} onValueChange={onValueChange}>
								<SelectTrigger className="h-8">
									<SelectValue placeholder="Select..." />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="new">
										{t("AdvancedFilters.status.new")}
									</SelectItem>
									<SelectItem value="closed">
										{t("AdvancedFilters.status.closed")}
									</SelectItem>
									<SelectItem value="contacted">
										{t("AdvancedFilters.status.contacted")}
									</SelectItem>
									<SelectItem value="negotiating">
										{t("AdvancedFilters.status.negotiating")}
									</SelectItem>
									<SelectItem value="registered">
										{t("AdvancedFilters.status.registered")}
									</SelectItem>
									<SelectItem value="backfill">
										{t("AdvancedFilters.status.backfill")}
									</SelectItem>
								</SelectContent>
							</Select>
						) : fieldType === "enum" && fieldName === "priority" ? (
							<Select value={value || ""} onValueChange={onValueChange}>
								<SelectTrigger className="h-8">
									<SelectValue placeholder="Select..." />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="p1">p1</SelectItem>
									<SelectItem value="p2">p2</SelectItem>
									<SelectItem value="p3">p3</SelectItem>
									<SelectItem value="p4">p4</SelectItem>
									<SelectItem value="p5">p5</SelectItem>
								</SelectContent>
							</Select>
						) : fieldType === "enum" && fieldName === "gender" ? (
							<Select value={value || ""} onValueChange={onValueChange}>
								<SelectTrigger className="h-8">
									<SelectValue placeholder="Select..." />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="male">
										{t("common.gender.male")}
									</SelectItem>
									<SelectItem value="female">
										{t("common.gender.female")}
									</SelectItem>
									<SelectItem value="other">
										{t("common.gender.other")}
									</SelectItem>
								</SelectContent>
							</Select>
						) : fieldType === "relation" ? (
							fieldName === "surveys" ? (
								<AsyncSelectField
									form={form}
									name={relationPath}
									serviceName={relationMeta.serviceName as BaseServiceName}
									useFormClear
									filterKey={relationMeta.filterKey}
								/>
							) : fieldName === "survey_items_question" ? (
								<AsyncSelectField
									form={form}
									name={relationPath}
									serviceName={relationMeta.serviceName as BaseServiceName}
									useFormClear
									filterKey={relationMeta.filterKey}
									filter={
										surveyId ? { survey: { id: { $eq: surveyId } } } : undefined
									}
									deduplicateByLabel
								/>
							) : fieldName === "survey_items_answer" ? (
								<AsyncSelectField
									form={form}
									name={relationPath}
									serviceName={relationMeta.serviceName as BaseServiceName}
									useFormClear
									filterKey={relationMeta.filterKey}
									filter={{
										...(surveyId ? { survey: { id: { $eq: surveyId } } } : {}),
										...(questionId ? { question: { $eq: questionId } } : {}),
									}}
								/>
							) : relationMeta ? (
								<AsyncSelectField
									form={form}
									name={relationPath}
									serviceName={relationMeta.serviceName as BaseServiceName}
									useFormClear
									{...(relationMeta.filterKey
										? { filterKey: relationMeta.filterKey }
										: {})}
									{...(relationMeta.deduplicateByLabel
										? { deduplicateByLabel: true }
										: {})}
								/>
							) : null
						) : (
							<Input
								className="h-8"
								type={fieldType === "number" ? "number" : "text"}
								inputMode={fieldType === "number" ? "numeric" : undefined}
								pattern={fieldType === "number" ? "[0-9]*" : undefined}
								value={value || ""}
								onChange={(e) => onValueChange(e.target.value)}
								placeholder="Enter value..."
							/>
						))}
				</div>
			</div>

			<Button
				type="button"
				variant="ghost"
				size="sm"
				onClick={onRemove}
				className="h-8 w-8 p-0 text-destructive hover:text-destructive"
			>
				<X className="h-4 w-4" />
			</Button>
		</div>
	);
};

export default FilterField;
