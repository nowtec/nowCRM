import type { ServiceName } from "@nowcrm/services";
import { z } from "zod";

export type FieldType = "text" | "number" | "date" | "relation" | "enum";

export interface FilterFieldConfig {
	name: string;
	type: FieldType;
	label?: string;
	serviceName?: ServiceName; // For relation fields
	filterKey?: string; // For relation fields - specifies which field to filter on in the related entity
	enumValues?: string[]; // For enum fields
	hasOperator?: boolean; // Default true for text/number/date
}

export interface FilterCategory {
	label: string;
	fields: string[];
}

export interface FilterConfig {
	fieldTypes: Record<string, FieldType>;
	fieldConfigs: Record<string, FilterFieldConfig>;
	categories: Record<string, FilterCategory>;
	relationMeta?: Record<
		string,
		{
			serviceName: string;
			labelKey: string;
			filterKey?: string;
			filter?: string;
			deduplicateByLabel?: boolean;
		}
	>;
}

/**
 * Generates a Zod schema for filters based on field configurations
 */
export function generateFilterSchema(config: FilterConfig): z.ZodObject<any> {
	const schemaFields: Record<string, z.ZodTypeAny> = {};

	// Add fields based on field types
	Object.entries(config.fieldTypes).forEach(([fieldName, fieldType]) => {
		const fieldConfig = config.fieldConfigs[fieldName];
		const hasOperator = fieldConfig?.hasOperator ?? true;

		if (fieldType === "relation") {
			// Relation fields use object with value and label
			schemaFields[fieldName] = z
				.object({
					value: z.number(),
					label: z.string(),
				})
				.optional();
		} else if (fieldType === "enum") {
			// Enum fields are just strings (no operator)
			schemaFields[fieldName] = z.string().optional();
		} else {
			// Text, number, date fields have value and optional operator
			schemaFields[fieldName] = z.string().optional();
			if (hasOperator) {
				schemaFields[`${fieldName}_operator`] = z.string().optional();
			}
		}
	});

	return z.object(schemaFields);
}

/**
 * Gets operators for a field based on its type
 */
export function getOperatorsForFieldType(
	fieldType: FieldType,
): Array<{ value: string; label: string }> {
	// Import operators dynamically to avoid circular dependencies
	if (fieldType === "number") {
		return [
			{ value: "$eqi", label: "Equals (case insensitive)" },
			{ value: "$ne", label: "Not equals" },
			{ value: "$gt", label: "Greater than" },
			{ value: "$gte", label: "Greater than or equal" },
			{ value: "$lt", label: "Less than" },
			{ value: "$lte", label: "Less than or equal" },
		];
	}
	if (fieldType === "date") {
		return [
			{ value: "$eq", label: "Equals" },
			{ value: "$ne", label: "Not equals" },
			{ value: "$gt", label: "After" },
			{ value: "$gte", label: "On or after" },
			{ value: "$lt", label: "Before" },
			{ value: "$lte", label: "On or before" },
		];
	}
	// Text operators
	return [
		{ value: "$containsi", label: "Contains" },
		{ value: "$notContainsi", label: "Does not contain" },
		{ value: "$eqi", label: "Equals (case insensitive)" },
		{ value: "$ne", label: "Not equals" },
		{ value: "$startsWithi", label: "Starts with" },
		{ value: "$endsWithi", label: "Ends with" },
	];
}
