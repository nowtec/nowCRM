"use client";

import type { BaseServiceName } from "@nowcrm/services";
import { format } from "date-fns";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { UseFormReturn } from "react-hook-form";
import { AsyncSelectField } from "@/components/autoComplete/async-select-field";
import { DateTimePicker } from "@/components/date-time-picker";
import { SearchableComboboxDialog } from "@/components/searchable-combobox-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import cantons from "@/lib/static/cantons.json";
import countries from "@/lib/static/countries.json";
import { getOperatorsForField } from "./filters-shared";

export interface FilterFieldConfig {
	FIELD_TYPES: Record<string, "text" | "number" | "date" | "relation" | "enum">;
	RELATION_META?: Record<
		string,
		{
			serviceName: string;
			labelKey: string;
			filterKey?: string;
			filter?: string;
			deduplicateByLabel?: boolean;
		}
	>;
	FIELD_CONFIGS?: Record<
		string,
		{
			hasOperator?: boolean;
		}
	>;
}

interface FilterFieldProps<
	T extends { groups: Array<{ filters?: Record<string, any> }> },
> {
	fieldName: string;
	value: any;
	operator: string;
	onValueChange: (value: any) => void;
	onOperatorChange: (operator: string) => void;
	onRemove: () => void;
	form: UseFormReturn<T>;
	groupIndex: number;
	config: FilterFieldConfig;
}

const FilterField = <
	T extends { groups: Array<{ filters?: Record<string, any> }> },
>({
	fieldName,
	value,
	operator,
	onValueChange,
	onOperatorChange,
	onRemove,
	form,
	groupIndex,
	config,
}: FilterFieldProps<T>) => {
	const t = useTranslations();
	// Strip numeric suffix for base field name
	const baseFieldName = fieldName.replace(/_\d+$/, "");
	const fieldType = config.FIELD_TYPES[baseFieldName] || "text";
	const operators = getOperatorsForField(baseFieldName, config.FIELD_TYPES);
	const isNullOperator = operator === "$null" || operator === "$notNull";

	const relationMeta = config.RELATION_META?.[baseFieldName];
	const fieldConfig = config.FIELD_CONFIGS?.[baseFieldName];
	const hasOperator = fieldConfig?.hasOperator !== false; // Default to true if not specified
	const relationPath = `groups.${groupIndex}.filters.${fieldName}` as any;
	const parsedDateValue = (() => {
		if (!value) return undefined;
		if (value instanceof Date) return value;
		if (typeof value === "string") {
			const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
			if (match) {
				const [, y, m, d] = match;
				return new Date(Number(y), Number(m) - 1, Number(d));
			}
			const parsed = new Date(value);
			return Number.isNaN(parsed.getTime()) ? undefined : parsed;
		}
		return undefined;
	})();

	return (
		<div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3">
			<div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
				<div className="min-w-[120px] shrink-0 font-medium text-sm">
					{baseFieldName
						.replace(/_/g, " ")
						.replace(/\b\w/g, (l) => l.toUpperCase())}
				</div>

				{fieldType !== "relation" && hasOperator && (
					<div className="min-w-[100px] shrink-0">
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
								displayFormat={{ hour24: "PPP", hour12: "PPP" }}
								value={parsedDateValue}
								onChange={(date) =>
									onValueChange(date ? format(date, "yyyy-MM-dd") : "")
								}
							/>
						) : fieldType === "enum" && baseFieldName === "language" ? (
							<Select value={value || ""} onValueChange={onValueChange}>
								<SelectTrigger className="h-8">
									<SelectValue placeholder="Select..." />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="en">English</SelectItem>
									<SelectItem value="de">Deutsch</SelectItem>
									<SelectItem value="fr">Français</SelectItem>
									<SelectItem value="it">Italiano</SelectItem>
								</SelectContent>
							</Select>
						) : fieldType === "enum" &&
							baseFieldName === "event_composition_sent_status" ? (
							<Select value={value || ""} onValueChange={onValueChange}>
								<SelectTrigger className="h-8">
									<SelectValue placeholder="Select..." />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="sent">
										{t(
											"AdvancedFilters.fields.event_composition_sent_status.sent",
										)}
									</SelectItem>
									<SelectItem value="not_sent">
										{t(
											"AdvancedFilters.fields.event_composition_sent_status.not_sent",
										)}
									</SelectItem>
								</SelectContent>
							</Select>
						) : fieldType === "text" && baseFieldName === "country" ? (
							<SearchableComboboxDialog
								options={countries}
								value={value ?? ""}
								onChange={onValueChange}
								placeholder={t("AdvancedFilters.placeholders.country")}
							/>
						) : fieldType === "text" && baseFieldName === "canton" ? (
							<SearchableComboboxDialog
								options={cantons}
								value={value ?? ""}
								onChange={onValueChange}
								placeholder={t("AdvancedFilters.placeholders.canton")}
							/>
						) : fieldType === "relation" && relationMeta ? (
							<AsyncSelectField
								form={form}
								name={relationPath}
								serviceName={relationMeta.serviceName as BaseServiceName}
								useFormClear={true}
								{...(relationMeta.filterKey
									? { filterKey: relationMeta.filterKey }
									: {})}
								{...(relationMeta.deduplicateByLabel
									? { deduplicateByLabel: true }
									: {})}
							/>
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
