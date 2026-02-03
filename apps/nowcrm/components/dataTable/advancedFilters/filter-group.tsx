"use client";

import { Plus, Trash2 } from "lucide-react";
import * as React from "react";
import { type Control, type UseFormReturn, useWatch } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import FilterField from "./filter-field";
import { getOperatorsForField } from "./filters-shared";

export interface FilterGroupConfig {
	FIELD_TYPES: Record<string, "text" | "number" | "date" | "relation" | "enum">;
	FILTER_CATEGORIES: Record<
		string,
		{
			label: string;
			fields: string[];
		}
	>;
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

interface FilterGroupProps<
	T extends {
		groups: Array<{ id: string; logic: string; filters?: Record<string, any> }>;
	},
> {
	form: UseFormReturn<T>;
	groupIndex: number;
	control: Control<T>;
	onUpdateGroup: (
		updates: Partial<{
			id: string;
			logic: string;
			filters?: Record<string, any>;
		}>,
	) => void;
	onRemoveGroup: () => void;
	config: FilterGroupConfig;
	canRemove: boolean;
}

const FilterGroupComponent = <
	T extends {
		groups: Array<{ id: string; logic: string; filters?: Record<string, any> }>;
	},
>({
	form,
	groupIndex,
	control,
	onUpdateGroup,
	onRemoveGroup,
	config,
	canRemove,
}: FilterGroupProps<T>) => {
	const [selectedCategory, setSelectedCategory] = React.useState<string>("");
	const [selectedField, setSelectedField] = React.useState<string>("");

	// Always read the live group from RHF state
	const watchedGroup = useWatch({
		control,
		name: `groups.${groupIndex}` as any,
	}) as { id: string; logic: string; filters?: Record<string, any> };
	const group = watchedGroup ?? { id: "", logic: "AND", filters: {} };

	const filtersPath = `groups.${groupIndex}.filters` as const;
	const currentFilters = () =>
		(form.getValues(filtersPath as any) ?? {}) as Record<string, any>;

	const addFilter = () => {
		if (!selectedField) return;
		const current = currentFilters();
		const newFilters = { ...current };

		// Append unique suffix for duplicate fields
		let fieldKey = selectedField;
		if (selectedField in current) {
			// Find the next available index for this field
			let index = 0;
			while (`${selectedField}_${index}` in current) {
				index++;
			}
			fieldKey = `${selectedField}_${index}`;
		}

		newFilters[fieldKey] = "";

		// Only for non-relation fields that have operators enabled
		const fieldConfig = config.FIELD_CONFIGS?.[selectedField];
		const hasOperator = fieldConfig?.hasOperator !== false; // Default to true if not specified
		if (config.FIELD_TYPES[selectedField] !== "relation" && hasOperator) {
			newFilters[`${fieldKey}_operator`] = getOperatorsForField(
				selectedField,
				config.FIELD_TYPES,
			)[0].value;
		}

		onUpdateGroup({ filters: newFilters });
		setSelectedField("");
		setSelectedCategory("");
	};

	const updateFilter = (fieldName: string, value: any, isOperator = false) => {
		const current = group.filters || {};
		const key = isOperator ? `${fieldName}_operator` : fieldName;
		const newFilters = { ...current, [key]: value };
		onUpdateGroup({ filters: newFilters });
	};

	const removeFilter = (fieldName: string) => {
		const current = { ...(group.filters || {}) };
		delete current[fieldName];
		delete current[`${fieldName}_operator`];
		onUpdateGroup({ filters: current });

		// Also unregister so RHF forgets it entirely
		form.unregister(`groups.${groupIndex}.filters.${fieldName}` as any);
		form.unregister(
			`groups.${groupIndex}.filters.${fieldName}_operator` as any,
		);
	};

	// Show everything the user added
	const displayFilters = Object.keys(group.filters || {}).filter(
		(key) => !key.endsWith("_operator"),
	);

	// Count only the ones that are effectively active
	const activeFiltersCount = displayFilters.filter((key) => {
		const val = group.filters?.[key];
		const op = group.filters?.[`${key}_operator`];
		const isNullOp = op === "$null" || op === "$notNull";
		return isNullOp || (val !== "" && val != null);
	}).length;

	return (
		<Card className="position-relative border">
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<CardTitle className="font-medium text-sm">
						Filter Group {groupIndex + 1}
						{activeFiltersCount > 0 && (
							<Badge variant="secondary" className="ml-2">
								{activeFiltersCount} filter{activeFiltersCount !== 1 ? "s" : ""}
							</Badge>
						)}
					</CardTitle>

					<div className="flex items-center gap-2">
						{displayFilters.length > 1 && (
							<div className="flex items-center gap-2">
								<span className="text-muted-foreground text-xs">
									Combine with:
								</span>
								<Select
									value={group.logic}
									onValueChange={(value: "AND" | "OR") =>
										onUpdateGroup({ logic: value })
									}
								>
									<SelectTrigger className="h-7 w-20">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="AND">AND</SelectItem>
										<SelectItem value="OR">OR</SelectItem>
									</SelectContent>
								</Select>
							</div>
						)}

						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={onRemoveGroup}
							disabled={!canRemove}
							aria-disabled={!canRemove}
							className={`h-7 w-7 p-0 ${
								canRemove
									? "text-destructive hover:text-destructive"
									: "text-muted-foreground"
							}`}
						>
							<Trash2 className="h-3 w-3" />
						</Button>
					</div>
				</div>
			</CardHeader>

			<CardContent className="space-y-3">
				{/* Active filters */}
				{displayFilters.map((fieldName) => (
					<FilterField
						key={`${groupIndex}-${fieldName}`}
						fieldName={fieldName}
						value={group.filters?.[fieldName]}
						operator={
							group.filters?.[`${fieldName}_operator`] ||
							getOperatorsForField(fieldName, config.FIELD_TYPES)[0].value
						}
						onValueChange={(value) => updateFilter(fieldName, value)}
						onOperatorChange={(operator) =>
							updateFilter(fieldName, operator, true)
						}
						onRemove={() => removeFilter(fieldName)}
						form={form}
						groupIndex={groupIndex}
						config={{
							FIELD_TYPES: config.FIELD_TYPES,
							RELATION_META: config.RELATION_META,
							FIELD_CONFIGS: config.FIELD_CONFIGS,
						}}
					/>
				))}

				{/* Add new filter */}
				<div className="flex items-center gap-2 rounded-lg border-2 border-dashed p-3">
					<Select value={selectedCategory} onValueChange={setSelectedCategory}>
						<SelectTrigger className="h-8">
							<SelectValue placeholder="Select category..." />
						</SelectTrigger>
						<SelectContent>
							{Object.entries(config.FILTER_CATEGORIES).map(
								([key, category]) => (
									<SelectItem key={key} value={key}>
										{category.label}
									</SelectItem>
								),
							)}
						</SelectContent>
					</Select>

					<Select
						value={selectedField}
						onValueChange={setSelectedField}
						disabled={!selectedCategory}
					>
						<SelectTrigger className="h-8">
							<SelectValue placeholder="Select field..." />
						</SelectTrigger>
						<SelectContent>
							{selectedCategory &&
								config.FILTER_CATEGORIES[
									selectedCategory as keyof typeof config.FILTER_CATEGORIES
								]?.fields.map((field) => (
									<SelectItem key={field} value={field}>
										{field
											.replace(/_/g, " ")
											.replace(/\b\w/g, (l) => l.toUpperCase())}
									</SelectItem>
								))}
						</SelectContent>
					</Select>

					<Button
						type="button"
						size="sm"
						onClick={addFilter}
						disabled={!selectedField}
						className="h-8"
					>
						<Plus className="h-4 w-4" />
					</Button>
				</div>
			</CardContent>
		</Card>
	);
};

export default FilterGroupComponent;
