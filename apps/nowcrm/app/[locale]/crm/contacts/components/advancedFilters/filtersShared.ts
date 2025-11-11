// filtersShared.ts
"use client";
import {
	DATE_OPERATORS,
	NUMBER_OPERATORS,
	type Operator,
	TEXT_OPERATORS,
} from "@nowcrm/services";
import { FIELD_TYPES } from "./filterTypes";

export function getOperatorsForField(field: string): Operator[] {
	const type = FIELD_TYPES[field] || "text";
	if (type === "number") return NUMBER_OPERATORS;
	if (type === "date") return DATE_OPERATORS;
	return TEXT_OPERATORS;
}
