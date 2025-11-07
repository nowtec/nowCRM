import type { DocumentId } from "./base_type";

export type StandardKeys<T> = {
	[K in keyof T]: T[K] extends object ? never : K; // Only keep keys that are not objects (primitive fields)
}[keyof T]; // This produces a union of keys that are not objects (i.e., primitive fields)

export type RelationalKeys<T> = {
	[K in keyof T]: T[K] extends object ? K : never; // Only keep keys that map to objects
}[keyof T]; // This produces a union of keys that map to objects (i.e., relationships)

export type Operator = { value: string; label: string };
export const TEXT_OPERATORS: Operator[] = [
	{ value: "$eqi", label: "Equal" },
	{ value: "$nei", label: "Not equal" },
	{ value: "$containsi", label: "Contains" },
	{ value: "$notContainsi", label: "Does not contain" },
	{ value: "$startsWithi", label: "Starts with" },
	{ value: "$endsWithi", label: "Ends with" },
];
export const NUMBER_OPERATORS: Operator[] = [
	{ value: "$eq", label: "Equal" },
	{ value: "$ne", label: "Not equal" },
	{ value: "$lt", label: "Less than" },
	{ value: "$lte", label: "Less than or equal to" },
	{ value: "$gt", label: "Greater than" },
	{ value: "$gte", label: "Greater than or equal to" },
];
export const DATE_OPERATORS = NUMBER_OPERATORS;

export type FilterOperators =
	| "$eq"
	| "$eqi"
	| "$ne"
	| "$nei"
	| "$lt"
	| "$lte"
	| "$gt"
	| "$gte"
	| "$in"
	| "$notIn"
	| "$contains"
	| "$notContains"
	| "$containsi"
	| "$notContainsi"
	| "$null"
	| "$notNull"
	| "$between"
	| "$startsWith"
	| "$startsWithi"
	| "$endsWith"
	| "$endsWithi";

export type FilterOperatorsAndValues<T> = {
	[K in FilterOperators]?: T | (T | null)[]; // Attribute operators (e.g., $eq, $lt)
};

export type FilterCondition<T> = {
	[K in keyof T]?: T[K] extends Array<infer U>
		? FilterCondition<U>
		: NonNullable<T[K]> extends object
			? FilterCondition<NonNullable<T[K]>>
			: FilterOperatorsAndValues<T[K]>;
};

export type Filters<T> = {
	$or?: FilterCondition<T>[]; // Logical OR
	$and?: FilterCondition<T>[]; // Logical AND
	$not?: FilterCondition<T>[]; // Logical NOT
} & FilterCondition<T>;

export type StrapiQuery<T> = {
	filters?: Filters<T>;
	fields?: Array<Extract<keyof T, string>>;
	sort?: Array<`${Extract<StandardKeys<T>, string>}:${"asc" | "desc"}`>;
	//TODO: remove any for deep populating cases
	populate?: Array<RelationalKeys<T>> | "*" | any;
	pagination?: {
		page?: number;
		pageSize?: number;
		total?: number;
		limit?: number;
		start?: number;
	};
	locale?: string;
};

/**
 * When relation is `to many` you have 3 possible ways to use them in form.
 * `connect` will add new entities to field.
 * `disconnect` will remove entities from field.
 * `set` will set all new entities.
 *
 */
export type StrapiConnect =
	| { connect: DocumentId[]; disconnect?: never; set?: never }
	| { disconnect: DocumentId[]; connect?: never; set?: never }
	| { set: DocumentId[]; connect?: never; disconnect?: never }
	| { connect: DocumentId[]; disconnect: DocumentId[]; set?: never };
