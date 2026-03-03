"use client";

import type { BaseServiceName } from "@nowcrm/services";
import { format } from "date-fns";
import { debounce } from "lodash";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import type { UseFormReturn } from "react-hook-form";
import { AsyncSelectField } from "@/components/autoComplete/async-select-field";
import {
	AutoComplete,
	type Option,
} from "@/components/autoComplete/auto-complete";
import { findData } from "@/components/autoComplete/find-data";
import { DateTimePicker } from "@/components/date-time-picker";
import { SearchableComboboxDialog } from "@/components/searchable-combobox-dialog";
import { Badge } from "@/components/ui/badge";
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
			filterKey?: string | string[];
			filter?: string;
			deduplicateByLabel?: boolean;
		}
	>;
	FIELD_CONFIGS?: Record<
		string,
		{
			hasOperator?: boolean;
			multiValue?: boolean;
			multiValuePlaceholder?: string;
			enumValues?: string[];
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

function uniqueValues(values: string[]) {
	const seen = new Set<string>();
	const result: string[] = [];
	for (const value of values) {
		const trimmed = value.trim();
		if (!trimmed || seen.has(trimmed)) continue;
		seen.add(trimmed);
		result.push(trimmed);
	}
	return result;
}

function normalizeMultiScalarValue(value: any): string[] {
	if (Array.isArray(value)) {
		return uniqueValues(
			value.map((entry) =>
				typeof entry === "string" || typeof entry === "number"
					? String(entry)
					: "",
			),
		);
	}

	if (typeof value === "string") {
		if (!value.trim()) return [];
		if (!value.includes(",")) return uniqueValues([value]);
		return uniqueValues(value.split(","));
	}

	if (typeof value === "number") {
		return [String(value)];
	}

	return [];
}

function emitScalarValues(
	nextValues: string[],
	onChange: (value: string | string[]) => void,
) {
	if (nextValues.length === 0) {
		onChange("");
		return;
	}
	if (nextValues.length === 1) {
		onChange(nextValues[0]);
		return;
	}
	onChange(nextValues);
}

type MultiScalarValueInputProps = {
	value: any;
	onChange: (value: string | string[]) => void;
	fieldType: "text" | "number";
	placeholder?: string;
};

function MultiScalarValueInput({
	value,
	onChange,
	fieldType,
	placeholder,
}: MultiScalarValueInputProps) {
	const [draft, setDraft] = React.useState("");
	const values = normalizeMultiScalarValue(value);

	const emit = (nextValues: string[]) => {
		emitScalarValues(nextValues, onChange);
	};

	const commitDraft = () => {
		if (!draft.trim()) return;
		const nextValues = uniqueValues([...values, ...draft.split(/[,\n]+/)]);
		emit(nextValues);
		setDraft("");
	};

	const removeValue = (item: string) => {
		emit(values.filter((v) => v !== item));
	};

	const sanitizeDraft = (nextDraft: string) =>
		fieldType === "number" ? nextDraft.replace(/[^\d,\n\s]/g, "") : nextDraft;

	return (
		<div className="min-h-8 rounded-md border bg-background px-2 py-1">
			<div className="flex flex-wrap items-center gap-1">
				{values.map((item) => (
					<Badge key={item} variant="secondary" className="gap-1 pr-1">
						<span>{item}</span>
						<button
							type="button"
							onClick={() => removeValue(item)}
							className="rounded p-0.5 hover:bg-muted"
							aria-label={`Remove value ${item}`}
						>
							<X className="h-3 w-3" />
						</button>
					</Badge>
				))}

				<input
					type="text"
					inputMode={fieldType === "number" ? "numeric" : undefined}
					pattern={fieldType === "number" ? "[0-9, ]*" : undefined}
					className="h-6 min-w-[120px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
					value={draft}
					onChange={(e) => setDraft(sanitizeDraft(e.target.value))}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === ",") {
							e.preventDefault();
							commitDraft();
							return;
						}
						if (e.key === "Backspace" && !draft && values.length > 0) {
							e.preventDefault();
							removeValue(values[values.length - 1]);
						}
					}}
					onBlur={commitDraft}
					placeholder={
						values.length === 0
							? (placeholder ?? "Enter value and press Enter")
							: ""
					}
				/>
			</div>
		</div>
	);
}

type MultiEnumValueInputProps = {
	value: any;
	onChange: (value: string | string[]) => void;
	enumValues: string[];
	getOptionLabel: (value: string) => string;
	placeholder?: string;
};

function MultiEnumValueInput({
	value,
	onChange,
	enumValues,
	getOptionLabel,
	placeholder,
}: MultiEnumValueInputProps) {
	const [selectKey, setSelectKey] = React.useState(0);
	const values = normalizeMultiScalarValue(value);
	const availableValues = enumValues.filter(
		(enumValue) => !values.includes(enumValue),
	);

	const emit = (nextValues: string[]) => emitScalarValues(nextValues, onChange);

	const addValue = (nextValue: string) => {
		emit(uniqueValues([...values, nextValue]));
		setSelectKey((prev) => prev + 1);
	};

	const removeValue = (valueToRemove: string) => {
		emit(values.filter((item) => item !== valueToRemove));
	};

	return (
		<div className="space-y-1">
			<div className="flex min-h-8 flex-wrap items-center gap-1 rounded-md border bg-background px-2 py-1">
				{values.map((item) => (
					<Badge key={item} variant="secondary" className="gap-1 pr-1">
						<span>{getOptionLabel(item)}</span>
						<button
							type="button"
							onClick={() => removeValue(item)}
							className="rounded p-0.5 hover:bg-muted"
							aria-label={`Remove value ${item}`}
						>
							<X className="h-3 w-3" />
						</button>
					</Badge>
				))}
				{values.length === 0 && (
					<span className="text-muted-foreground text-sm">
						{placeholder ?? "Select one or more values"}
					</span>
				)}
			</div>

			<Select
				key={selectKey}
				onValueChange={addValue}
				disabled={availableValues.length === 0}
			>
				<SelectTrigger className="h-8">
					<SelectValue
						placeholder={
							availableValues.length === 0
								? "All values selected"
								: (placeholder ?? "Add value...")
						}
					/>
				</SelectTrigger>
				<SelectContent>
					{availableValues.map((enumValue) => (
						<SelectItem key={enumValue} value={enumValue}>
							{getOptionLabel(enumValue)}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}

type RelationMetaItem = NonNullable<FilterFieldConfig["RELATION_META"]>[string];

function normalizeRelationValues(value: any): Option[] {
	const asOption = (item: any): Option | null => {
		if (!item || typeof item !== "object") return null;
		if (!("value" in item) || !("label" in item)) return null;
		const optionValue = item.value;
		const optionLabel = item.label;
		if (
			(typeof optionValue !== "string" && typeof optionValue !== "number") ||
			typeof optionLabel !== "string"
		) {
			return null;
		}
		return { value: String(optionValue), label: optionLabel };
	};

	if (Array.isArray(value)) {
		const normalized = value
			.map(asOption)
			.filter((item): item is Option => !!item);
		const seen = new Set<string>();
		return normalized.filter((item) => {
			if (seen.has(item.value)) return false;
			seen.add(item.value);
			return true;
		});
	}

	const single = asOption(value);
	return single ? [single] : [];
}

function emitRelationValues(
	nextValues: Option[],
	onChange: (value: any) => void,
) {
	if (nextValues.length === 0) {
		onChange(null);
		return;
	}
	if (nextValues.length === 1) {
		onChange(nextValues[0]);
		return;
	}
	onChange(nextValues);
}

type AsyncRelationMultiValueInputProps = {
	value: any;
	onChange: (value: any) => void;
	relationMeta: RelationMetaItem;
	label: string;
};

function AsyncRelationMultiValueInput({
	value,
	onChange,
	relationMeta,
	label,
}: AsyncRelationMultiValueInputProps) {
	const [options, setOptions] = React.useState<Option[]>([]);
	const [isLoading, setIsLoading] = React.useState(false);
	const [search, setSearch] = React.useState("");
	const [pickerKey, setPickerKey] = React.useState(0);
	const selectedValues = normalizeRelationValues(value);

	const emit = React.useCallback(
		(nextValues: Option[]) => emitRelationValues(nextValues, onChange),
		[onChange],
	);

	const addValue = React.useCallback(
		(option: Option) => {
			const nextValues = [...selectedValues, option].filter(
				(item, index, arr) =>
					arr.findIndex((candidate) => candidate.value === item.value) ===
					index,
			);
			emit(nextValues);
			setSearch("");
			setPickerKey((prev) => prev + 1);
		},
		[selectedValues, emit],
	);

	const removeValue = React.useCallback(
		(valueToRemove: string) => {
			emit(selectedValues.filter((item) => item.value !== valueToRemove));
		},
		[selectedValues, emit],
	);

	React.useEffect(() => {
		const handler = debounce(async (query: string) => {
			setIsLoading(true);
			try {
				const keys = Array.isArray(relationMeta.filterKey)
					? relationMeta.filterKey
					: [relationMeta.filterKey || "name"];
				const words = query.trim().split(/\s+/).filter(Boolean);

				const searchFilters = words.length
					? {
							$and: words.map((word) => ({
								$or: keys.map((key) => ({
									[key]: { $containsi: word },
								})),
							})),
						}
					: {};

				const response = await findData(
					relationMeta.serviceName as BaseServiceName,
					{
						filters: searchFilters as any,
						pagination: { page: 1, pageSize: 20 },
					},
				);

				const fetched = (response.data ?? [])
					.map((item: any) => {
						const primaryKey = keys[0];
						const optionLabel = item?.[primaryKey];
						const optionValue = item?.documentId;
						if (!optionLabel || optionValue == null) return null;
						return { label: String(optionLabel), value: String(optionValue) };
					})
					.filter((item: any): item is Option => !!item);

				const seen = new Set<string>();
				setOptions(
					fetched.filter((item) => {
						const dedupeKey = relationMeta.deduplicateByLabel
							? item.label
							: item.value;
						if (seen.has(dedupeKey)) return false;
						seen.add(dedupeKey);
						return true;
					}),
				);
			} catch (error) {
				console.error("Error fetching relation options:", error);
			} finally {
				setIsLoading(false);
			}
		}, 300);

		handler(search);
		return () => handler.cancel();
	}, [search, relationMeta]);

	const selectedSet = new Set(selectedValues.map((item) => item.value));
	const availableOptions = options.filter(
		(item) => !selectedSet.has(item.value),
	);

	return (
		<div className="space-y-1">
			<div className="flex min-h-8 flex-wrap items-center gap-1 rounded-md border bg-background px-2 py-1">
				{selectedValues.map((item) => (
					<Badge key={item.value} variant="secondary" className="gap-1 pr-1">
						<span>{item.label}</span>
						<button
							type="button"
							onClick={() => removeValue(item.value)}
							className="rounded p-0.5 hover:bg-muted"
							aria-label={`Remove ${item.label}`}
						>
							<X className="h-3 w-3" />
						</button>
					</Badge>
				))}
				{selectedValues.length === 0 && (
					<span className="text-muted-foreground text-sm">
						Select one or more
					</span>
				)}
			</div>

			<AutoComplete
				key={pickerKey}
				options={availableOptions}
				value={undefined}
				onValueChange={addValue}
				onInputChange={setSearch}
				emptyMessage="No results."
				placeholder={`Search ${label.toLowerCase()}...`}
				isLoading={isLoading}
				isClearEnabled={false}
			/>
		</div>
	);
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
	const enumValues = fieldConfig?.enumValues ?? [];
	const isMultiScalarField =
		fieldConfig?.multiValue === true &&
		(fieldType === "text" || fieldType === "number");
	const isMultiEnumField =
		fieldConfig?.multiValue === true &&
		fieldType === "enum" &&
		enumValues.length > 0;
	const isMultiRelationField =
		fieldConfig?.multiValue === true &&
		fieldType === "relation" &&
		!!relationMeta;
	const relationPath = `groups.${groupIndex}.filters.${fieldName}` as any;

	const getEnumOptionLabel = React.useCallback(
		(enumValue: string) => {
			if (baseFieldName === "language") {
				const languageLabels: Record<string, string> = {
					en: "English",
					de: "Deutsch",
					fr: "Français",
					it: "Italiano",
				};
				return languageLabels[enumValue] || enumValue;
			}
			if (baseFieldName === "event_composition_sent_status") {
				if (enumValue === "sent") {
					return t("AdvancedFilters.fields.event_composition_sent_status.sent");
				}
				if (enumValue === "not_sent") {
					return t(
						"AdvancedFilters.fields.event_composition_sent_status.not_sent",
					);
				}
			}
			return enumValue
				.replace(/_/g, " ")
				.replace(/\b\w/g, (letter) => letter.toUpperCase());
		},
		[baseFieldName, t],
	);

	return (
		<div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3">
			<div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
				<div className="min-w-[120px] shrink-0 font-medium text-sm">
					{baseFieldName
						.replace(/_/g, " ")
						.replace(/\b\w/g, (l) => l.toUpperCase())}
				</div>

				{hasOperator && (
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
								value={value ? new Date(value) : undefined}
								onChange={(date) =>
									onValueChange(date ? format(date, "yyyy-MM-dd") : "")
								}
							/>
						) : isMultiEnumField ? (
							<MultiEnumValueInput
								value={value}
								onChange={onValueChange}
								enumValues={enumValues}
								getOptionLabel={getEnumOptionLabel}
								placeholder={fieldConfig?.multiValuePlaceholder}
							/>
						) : isMultiRelationField && relationMeta ? (
							<AsyncRelationMultiValueInput
								value={value}
								onChange={onValueChange}
								relationMeta={relationMeta}
								label={baseFieldName.replace(/_/g, " ")}
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
						) : fieldType === "enum" && enumValues.length > 0 ? (
							<Select value={value || ""} onValueChange={onValueChange}>
								<SelectTrigger className="h-8">
									<SelectValue placeholder="Select..." />
								</SelectTrigger>
								<SelectContent>
									{enumValues.map((enumValue) => (
										<SelectItem key={enumValue} value={enumValue}>
											{getEnumOptionLabel(enumValue)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						) : isMultiScalarField ? (
							<MultiScalarValueInput
								value={value}
								onChange={onValueChange}
								fieldType={fieldType}
								placeholder={fieldConfig?.multiValuePlaceholder}
							/>
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
