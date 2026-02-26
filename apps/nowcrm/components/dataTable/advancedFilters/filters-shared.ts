"use client";
import {
	DATE_OPERATORS,
	NUMBER_OPERATORS,
	type Operator,
	TEXT_OPERATORS,
} from "@nowcrm/services";

const RELATION_OPERATORS: Operator[] = [
	{ value: "$eqi", label: "Equal" },
	{ value: "$nei", label: "Not equal" },
	{ value: "$null", label: "Is empty" },
	{ value: "$notNull", label: "Is not empty" },
];

export function getOperatorsForField(
	field: string,
	fieldTypes: Record<string, "text" | "number" | "date" | "relation" | "enum">,
): Operator[] {
	const type = fieldTypes[field] || "text";
	if (type === "relation") return RELATION_OPERATORS;
	if (type === "number") return NUMBER_OPERATORS;
	if (type === "date") return DATE_OPERATORS;
	return TEXT_OPERATORS;
}
