import qs from "qs";
import languages from "@/lib/static/iso639-languages.json";
import { normalizeLanguageValue } from "@/lib/utils/language-utils";
import {
	buildEventCompositionSentStatusAloneCondition,
	buildEventCompositionSentStatusCondition,
	hasEventCompositionSentStatusCombination,
} from "./special-cases/event-composition-sent-status";

const FIELD_OVERRIDES: Record<string, string[]> = {
	subscriptions: ["channel", "name"],
	contact_interests: ["name"],
	contact_types: ["name"],
	ranks: ["name"],
	department: ["name"],
	job_title: ["name"],
	media_types: ["name"],
	organization: ["name"],
	industry: ["name"],
	lists: ["name"],
	sources: ["name"],
	journeys: ["name"],
	journey_steps: ["name"],
	surveys: ["name"],
	tags: ["name"],
	salutation: ["name"],
	title: ["name"],
	// Organization relation fields - filter by name field on related entity (Strapi v5 requires nested field path)
	organization_type: ["name"],
	frequency: ["name"],
	media_type: ["name"],
};

const FIELD_ALIASES: Record<string, string> = {
	language_free_form: "language",
	organization_name: "organization.name",
	organization_createdAt: "organization.createdAt",
	organization_updatedAt: "organization.updatedAt",
	survey_items_question: "survey_items.question",
	survey_items_answer: "survey_items.answer",
	event_composition: "events.composition.category",
	event_channel: "events.channel.name",
	event_title: "events.title",
	event_action: "events.action",
	event_status: "events.status",
	donation_subscriptions_from: "donation_subscriptions.createdAt",
	donation_subscriptions_amount: "donation_subscriptions.amount",
	donation_subscriptions_interval: "donation_subscriptions.interval",
	donation_transactions_from: "donation_transactions.createdAt",
	donation_transactions_amount: "donation_transactions.amount",
	donation_transactions_campaign_name: "donation_transactions.campaign_name",
	donation_transactions_status:
		"donation_transactions.donation_transaction_status",
	action_type: "actions.action_type.name",
	action_source: "actions.source",
	action_value: "actions.value",
	action_external_id: "actions.external_id",
	action_partnership: "actions.partnership",
};

/* ----------------- tiny helpers ----------------- */

function setNested(target: any, path: string, value: any) {
	const keys = path.split(".");
	let cur = target;
	keys.forEach((k, i) => {
		if (i === keys.length - 1) {
			if (typeof cur[k] === "object" && typeof value === "object") {
				cur[k] = { ...cur[k], ...value };
			} else {
				cur[k] = value;
			}
		} else {
			if (!cur[k] || typeof cur[k] !== "object") cur[k] = {};
			cur = cur[k];
		}
	});
}

function buildNestedObject(path: string[], value: any): any {
	if (!path.length) return value;
	const [h, ...r] = path;
	return { [h]: buildNestedObject(r, value) };
}

function deepMerge(target: any, source: any) {
	for (const k of Object.keys(source)) {
		const sv = source[k];
		if (
			sv &&
			typeof sv === "object" &&
			!Array.isArray(sv) &&
			!(sv instanceof Date)
		) {
			if (!target[k] || typeof target[k] !== "object") target[k] = {};
			deepMerge(target[k], sv);
		} else {
			target[k] = sv;
		}
	}
}

function isPlainObject(value: unknown): value is Record<string, any> {
	return !!value && typeof value === "object" && !Array.isArray(value);
}

function isFilterValuePresent(value: any, operator?: string): boolean {
	const isNullOperator = operator === "$null" || operator === "$notNull";
	return (
		isNullOperator ||
		(value !== "" &&
			value != null &&
			!(Array.isArray(value) && value.length === 0))
	);
}

function buildRelationEmptyCondition(key: string): Record<string, any> {
	const condition: Record<string, any> = {};
	const aliased = FIELD_ALIASES[key] || key;
	setNested(condition, aliased, { $null: true });
	return condition;
}

function bindSubscriptionsWithActiveCondition(
	subscriptionCondition: Record<string, any>,
	subscriptionsActiveConditions: Array<Record<string, any>>,
): Record<string, any> {
	if (subscriptionsActiveConditions.length === 0) return subscriptionCondition;
	const mergedCondition: Record<string, any> = {};
	deepMerge(mergedCondition, subscriptionCondition);

	const directRelationCondition = isPlainObject(mergedCondition.subscriptions)
		? mergedCondition.subscriptions
		: null;
	const topLevelOrNotRelationCondition =
		Array.isArray(mergedCondition.$or) && mergedCondition.$or.length > 0
			? mergedCondition.$or.find(
					(branch) =>
						isPlainObject(branch) &&
						isPlainObject(branch.$not) &&
						isPlainObject(branch.$not.subscriptions),
				)?.$not?.subscriptions || null
			: null;
	const topLevelNotRelationCondition =
		isPlainObject(mergedCondition.$not) &&
		isPlainObject(mergedCondition.$not.subscriptions)
			? mergedCondition.$not.subscriptions
			: null;

	const relationCondition =
		topLevelNotRelationCondition ||
		topLevelOrNotRelationCondition ||
		directRelationCondition;
	if (!relationCondition) return subscriptionCondition;

	// For negative relation filters like { subscriptions: { $not: {...} } },
	// active constraints must be added inside $not to keep "same subscription row" semantics.
	const mergeTarget = isPlainObject(relationCondition.$not)
		? relationCondition.$not
		: relationCondition;

	for (const activeCondition of subscriptionsActiveConditions) {
		const activeRelationCondition = activeCondition.subscriptions;
		if (!isPlainObject(activeRelationCondition)) continue;
		deepMerge(mergeTarget, activeRelationCondition);
	}

	// For "(NOT relation) OR relation IS NULL" shape, AND-ing with subscriptions_active
	// means relation cannot be NULL, so collapse back to NOT-relation branch only.
	if (Array.isArray(mergedCondition.$or)) {
		const nonNullBranches = mergedCondition.$or.filter(
			(branch) =>
				!(
					isPlainObject(branch) &&
					isPlainObject(branch.subscriptions) &&
					branch.subscriptions.$null === true
				),
		);

		if (nonNullBranches.length !== mergedCondition.$or.length) {
			if (nonNullBranches.length === 1) {
				const collapsed = nonNullBranches[0];
				for (const key of Object.keys(mergedCondition))
					delete mergedCondition[key];
				deepMerge(mergedCondition, collapsed);
			} else {
				mergedCondition.$or = nonNullBranches;
			}
		}
	}

	return mergedCondition;
}

const isRelObject = (v: any) => v && typeof v === "object" && "value" in v;
const isRelArray = (v: any) =>
	Array.isArray(v) &&
	v.length > 0 &&
	v.every((x) => x && typeof x === "object" && "value" in x);
const isScalarArray = (v: unknown): v is Array<string | number | boolean> =>
	Array.isArray(v) &&
	v.length > 0 &&
	v.every(
		(x) =>
			typeof x === "string" || typeof x === "number" || typeof x === "boolean",
	);
const DATE_EQ_FIELDS = new Set([
	"donation_subscriptions_from",
	"donation_transactions_from",
]);

function detectValueShape(value: any): string {
	if (isRelArray(value)) return "relation_array";
	if (isRelObject(value)) return "relation_object";
	if (isScalarArray(value)) return "scalar_array";
	if (Array.isArray(value)) return "array_other";
	if (value === null) return "null";
	return typeof value;
}

function logSubscriptionFilter(
	stage: string,
	payload: Record<string, any>,
): void {
	try {
		console.log(`[subscription-filter] ${stage}: ${JSON.stringify(payload)}`);
	} catch {
		console.log(`[subscription-filter] ${stage}:`, payload);
	}
}

function normalizeSubscriptionActiveValue(value: any): boolean | null {
	if (typeof value === "boolean") return value;
	if (typeof value === "number") {
		if (value === 1) return true;
		if (value === 0) return false;
	}
	if (typeof value === "string") {
		const normalized = value.trim().toLowerCase();
		if (["active", "true", "1"].includes(normalized)) return true;
		if (
			["not_active", "not active", "inactive", "false", "0"].includes(
				normalized,
			)
		) {
			return false;
		}
	}
	return null;
}

/* Build a single Strapi condition object for a field */
function buildFieldCondition(
	key: string,
	rawValue: any,
	operator?: string,
): Record<string, any> {
	let op = operator || "$eqi";
	const cond: any = {};
	const isSubscriptionDebugKey =
		key === "subscriptions" || key === "subscriptions_active";

	if (isSubscriptionDebugKey) {
		logSubscriptionFilter("input", {
			key,
			operator: op,
			shape: detectValueShape(rawValue),
			value: rawValue,
		});
	}

	// handle null / notNull operators that ignore value
	if (op === "$null" || op === "$notNull") {
		const aliased = FIELD_ALIASES[key] || key;
		setNested(cond, aliased, { [op]: true });
		if (isSubscriptionDebugKey) {
			logSubscriptionFilter("output/null_operator", {
				key,
				operator: op,
				condition: cond,
			});
		}
		return cond;
	}

	// Synthetic field used by UI to filter relation boolean flag:
	// subscriptions_active -> subscriptions.active
	if (key === "subscriptions_active") {
		const values = Array.isArray(rawValue) ? rawValue : [rawValue];
		const normalizedValues = [
			...new Set(
				values
					.map((value) => normalizeSubscriptionActiveValue(value))
					.filter((value): value is boolean => value !== null),
			),
		];

		if (normalizedValues.length === 0) {
			logSubscriptionFilter("output/subscriptions_active_empty", {
				key,
				operator: op,
			});
			return cond;
		}

		const isNegative = ["$ne", "$nei", "$notIn"].includes(op);
		if (normalizedValues.length === 1) {
			setNested(cond, "subscriptions.active", {
				[isNegative ? "$ne" : "$eq"]: normalizedValues[0],
			});
			logSubscriptionFilter("output/subscriptions_active_single", {
				key,
				operator: op,
				normalizedValues,
				condition: cond,
			});
			return cond;
		}

		setNested(cond, "subscriptions.active", {
			[isNegative ? "$notIn" : "$in"]: normalizedValues,
		});
		logSubscriptionFilter("output/subscriptions_active_multi", {
			key,
			operator: op,
			normalizedValues,
			condition: cond,
		});
		return cond;
	}

	// Date-only equality on specific fields (ignore hours)
	if (DATE_EQ_FIELDS.has(key) && (op === "$eq" || op === "$eqi")) {
		const date = rawValue instanceof Date ? rawValue : new Date(rawValue);
		if (!Number.isNaN(date.getTime())) {
			const start = new Date(date.getTime());
			start.setUTCHours(0, 0, 0, 0);
			const end = new Date(start.getTime());
			end.setUTCDate(end.getUTCDate() + 1);
			const aliased = FIELD_ALIASES[key] || key;
			setNested(cond, aliased, {
				$gte: start.toISOString(),
				$lt: end.toISOString(),
			});
			return cond;
		}
	}

	// relation single
	if (isRelObject(rawValue)) {
		const v = rawValue.label;
		const overridePath = FIELD_OVERRIDES[key];
		const aliased = FIELD_ALIASES[key];
		const isNegativeRelation = ["$ne", "$nei", "$notIn"].includes(op);
		const relationCond: any = {};

		if (overridePath) {
			// subscriptions.channel.name -> { subscriptions: { channel: { name: { $eq: v } } } }
			relationCond[key] = buildNestedObject(overridePath, {
				[isNegativeRelation ? "$eqi" : op]: v,
			});
		} else if (aliased) {
			setNested(relationCond, aliased, {
				[isNegativeRelation ? "$eqi" : op]: v,
			});
		} else {
			relationCond[key] = { documentId: { $eq: rawValue.value } };
		}

		if (isNegativeRelation) {
			const relationIsNullCond = buildRelationEmptyCondition(key);
			const condition = { $or: [{ $not: relationCond }, relationIsNullCond] };
			if (isSubscriptionDebugKey) {
				logSubscriptionFilter("output/relation_single_negative_not_or_null", {
					key,
					operator: op,
					condition,
				});
			}
			return condition;
		}
		if (isSubscriptionDebugKey) {
			logSubscriptionFilter("output/relation_single_positive", {
				key,
				operator: op,
				condition: relationCond,
			});
		}
		return relationCond;
	}

	// relation multi
	if (isRelArray(rawValue)) {
		const labels = rawValue.map((x: any) => x.label).filter(Boolean);
		const ids = rawValue.map((x: any) => x.value).filter(Boolean);
		const overridePath = FIELD_OVERRIDES[key];
		const aliased = FIELD_ALIASES[key];
		const isNegativeRelation = ["$ne", "$nei", "$notIn"].includes(op);
		const relationCond: any = {};
		if (overridePath) {
			relationCond[key] = buildNestedObject(overridePath, { $in: labels });
		} else if (aliased) {
			setNested(relationCond, aliased, { $in: labels });
		} else {
			// default to relation documentId in list
			relationCond[key] = { documentId: { $in: ids } };
		}

		if (isNegativeRelation) {
			const relationIsNullCond = buildRelationEmptyCondition(key);
			const condition = { $or: [{ $not: relationCond }, relationIsNullCond] };
			if (isSubscriptionDebugKey) {
				logSubscriptionFilter("output/relation_multi_negative_not_or_null", {
					key,
					operator: op,
					condition,
				});
			}
			return condition;
		}
		if (isSubscriptionDebugKey) {
			logSubscriptionFilter("output/relation_multi_positive", {
				key,
				operator: op,
				condition: relationCond,
			});
		}
		return relationCond;
	}

	// language arrays need the same flexible matching as single-value language filters
	if (
		(key === "language" || key === "language_free_form") &&
		isScalarArray(rawValue)
	) {
		const rawValues = rawValue
			.map((v) => (typeof v === "string" ? v.trim() : String(v)))
			.filter(Boolean);
		const aliased = FIELD_ALIASES[key] || key;
		const cmpOp = ["$ne", "$nei", "$notIn"].includes(op) ? "$nei" : "$eqi";
		const combineWith = ["$ne", "$nei", "$notIn"].includes(op) ? "$and" : "$or";

		const expandedVariants = rawValues.flatMap((raw) => {
			const normalized = normalizeLanguageValue(raw);
			if (!normalized) return [raw];
			const languageInfo = languages.find((l: any) => l.code === normalized);
			const variants = [normalized];
			if (languageInfo?.name) variants.push(languageInfo.name);
			if (
				languageInfo?.nativeName &&
				languageInfo.nativeName !== languageInfo.name
			) {
				variants.push(languageInfo.nativeName);
			}
			return variants;
		});

		const uniqueVariants = [...new Set(expandedVariants.filter(Boolean))];
		if (uniqueVariants.length === 0) return cond;

		const conditions = uniqueVariants.map((variant) =>
			buildNestedObject(aliased.split("."), { [cmpOp]: variant }),
		);
		if (conditions.length === 1) return conditions[0];
		return { [combineWith]: conditions };
	}

	// scalar multi-value (chips input for text/number/enum fields) -> IN/NOT IN
	if (isScalarArray(rawValue)) {
		const values = rawValue
			.map((v) => (typeof v === "string" ? v.trim() : v))
			.filter((v) => v !== "" && v != null);

		if (values.length === 0) {
			if (isSubscriptionDebugKey) {
				logSubscriptionFilter("output/scalar_array_empty", {
					key,
					operator: op,
				});
			}
			return cond;
		}

		// Preserve scalar operator semantics when the UI currently holds exactly one value.
		if (values.length === 1) {
			const aliased = FIELD_ALIASES[key] || key;
			setNested(cond, aliased, { [op]: values[0] });
			if (isSubscriptionDebugKey) {
				logSubscriptionFilter("output/scalar_array_single", {
					key,
					operator: op,
					values,
					condition: cond,
				});
			}
			return cond;
		}

		// Equality-like operators can be compacted into IN / NOT IN
		if (["$eq", "$eqi", "$in", "$ne", "$nei", "$notIn"].includes(op)) {
			op = ["$ne", "$nei", "$notIn"].includes(op) ? "$notIn" : "$in";
			const aliased = FIELD_ALIASES[key] || key;
			setNested(cond, aliased, { [op]: values });
			if (isSubscriptionDebugKey) {
				logSubscriptionFilter("output/scalar_array_in_notin", {
					key,
					operator: op,
					values,
					condition: cond,
				});
			}
			return cond;
		}

		// For operators like contains/startsWith/< etc., preserve semantics by
		// expanding into logical combinations of single-value conditions.
		const expandedConditions = values
			.map((singleValue) => buildFieldCondition(key, singleValue, op))
			.filter((c) => Object.keys(c || {}).length > 0);

		if (expandedConditions.length === 0) return cond;
		if (expandedConditions.length === 1) {
			if (isSubscriptionDebugKey) {
				logSubscriptionFilter("output/scalar_array_expanded_single", {
					key,
					operator: op,
					condition: expandedConditions[0],
				});
			}
			return expandedConditions[0];
		}

		const useAnd = ["$notContains", "$notContainsi"].includes(op);
		const condition = useAnd
			? { $and: expandedConditions }
			: { $or: expandedConditions };
		if (isSubscriptionDebugKey) {
			logSubscriptionFilter("output/scalar_array_expanded_multi", {
				key,
				operator: op,
				condition,
			});
		}
		return condition;
	}

	// CSV string → IN/NOT IN
	if (
		typeof rawValue === "string" &&
		rawValue.includes(",") &&
		!["country", "canton"].includes(key)
	) {
		const values = rawValue
			.split(",")
			.map((v) => v.trim())
			.filter(Boolean);
		if (isSubscriptionDebugKey) {
			logSubscriptionFilter("input/csv_string_to_array", {
				key,
				operator: op,
				values,
			});
		}
		return buildFieldCondition(key, values, op);
	}

	// Handle language field with flexible matching (code OR name formats)
	// Matches both ISO code ("de"), English name ("German"), AND native name ("Deutsch")
	if (
		(key === "language" || key === "language_free_form") &&
		typeof rawValue === "string"
	) {
		const normalized = normalizeLanguageValue(rawValue);
		if (normalized) {
			// Get the language info to find both the code and the full name
			const languageInfo = languages.find((l: any) => l.code === normalized);
			const languageName = languageInfo?.name;
			const nativeName = languageInfo?.nativeName;

			// Create proper $or structure at top level with case-insensitive matching
			// Strapi requires: {$or: [{language: {$eqi: "de"}}, {language: {$eqi: "German"}}, {language: {$eqi: "Deutsch"}}]}
			// Using $eqi (case-insensitive equals) to handle "GeRmAn", "german", "GERMAN", etc.
			if (languageName) {
				const aliased = FIELD_ALIASES[key] || key;
				const orConditions = [
					buildNestedObject(aliased.split("."), { $eqi: normalized }),
					buildNestedObject(aliased.split("."), { $eqi: languageName }),
				];

				// Add native name if it's different from English name
				if (nativeName && nativeName !== languageName) {
					orConditions.push(
						buildNestedObject(aliased.split("."), { $eqi: nativeName }),
					);
				}

				return { $or: orConditions };
			}
		}
	}

	// plain scalar
	const aliased = FIELD_ALIASES[key] || key;
	setNested(cond, aliased, { [op]: rawValue });
	if (isSubscriptionDebugKey) {
		logSubscriptionFilter("output/plain_scalar", {
			key,
			operator: op,
			condition: cond,
		});
	}
	return cond;
}

/* Build one group from its filters object */
function buildGroup(filtersObj: Record<string, any>, groupLogic: "AND" | "OR") {
	// Group all filters by their base field name (stripping _0, _1, etc. suffixes)
	const fieldGroups: Record<
		string,
		Array<{ key: string; value: any; operator?: string }>
	> = {};

	for (const [k, v] of Object.entries(filtersObj || {})) {
		if (k.endsWith("_operator")) continue;

		// Extract base field name by removing numeric suffix (_0, _1, etc.)
		const baseField = k.replace(/_\d+$/, "");
		const op = filtersObj[`${k}_operator`];

		if (!fieldGroups[baseField]) {
			fieldGroups[baseField] = [];
		}

		fieldGroups[baseField].push({ key: k, value: v, operator: op });
	}

	// Special handling: Check if both event_composition and event_composition_sent_status are present
	const { hasEventComposition, hasEventCompositionSentStatus } =
		hasEventCompositionSentStatusCombination(fieldGroups);

	const shouldBindSubscriptionsActive =
		groupLogic === "AND" &&
		Array.isArray(fieldGroups.subscriptions) &&
		fieldGroups.subscriptions.length > 0 &&
		Array.isArray(fieldGroups.subscriptions_active) &&
		fieldGroups.subscriptions_active.length > 0;

	const subscriptionsActiveConditions = shouldBindSubscriptionsActive
		? fieldGroups.subscriptions_active
				.filter((instance) =>
					isFilterValuePresent(instance.value, instance.operator),
				)
				.map((instance) =>
					buildFieldCondition(
						"subscriptions_active",
						instance.value,
						instance.operator,
					),
				)
				.filter((condition) => Object.keys(condition).length > 0)
		: [];

	// Build conditions for each field group
	const conditions: any[] = [];

	for (const [baseField, instances] of Object.entries(fieldGroups)) {
		if (
			shouldBindSubscriptionsActive &&
			subscriptionsActiveConditions.length > 0 &&
			baseField === "subscriptions_active"
		) {
			// handled together with subscriptions to ensure channel+active are matched
			// against the same relation row
			continue;
		}

		// Skip event_composition_sent_status if we're handling it together with event_composition
		if (
			baseField === "event_composition_sent_status" &&
			hasEventComposition &&
			hasEventCompositionSentStatus
		) {
			continue;
		}

		const fieldConditions: any[] = [];

		for (const instance of instances) {
			// skip blanks unless operator is null/notNull
			if (!isFilterValuePresent(instance.value, instance.operator)) continue;

			// Synthetic field handled only by the dedicated special-case logic below.
			// Never let it fall through to generic field handling because there is no
			// real Strapi field named event_composition_sent_status.
			if (baseField === "event_composition_sent_status") {
				continue;
			}

			// Special handling for event_composition when combined with sent_status
			if (
				baseField === "event_composition" &&
				hasEventComposition &&
				hasEventCompositionSentStatus
			) {
				const sentStatusValue =
					fieldGroups.event_composition_sent_status?.[0]?.value;
				const condition = buildEventCompositionSentStatusCondition(
					instance.value,
					sentStatusValue,
				);
				if (condition) {
					fieldConditions.push(condition);
				}
			} else {
				let fieldCond = buildFieldCondition(
					baseField,
					instance.value,
					instance.operator,
				);

				if (
					shouldBindSubscriptionsActive &&
					subscriptionsActiveConditions.length > 0 &&
					baseField === "subscriptions"
				) {
					fieldCond = bindSubscriptionsWithActiveCondition(
						fieldCond,
						subscriptionsActiveConditions,
					);
					logSubscriptionFilter("output/subscriptions_bound_with_active", {
						baseField,
						condition: fieldCond,
					});
				}

				if (Object.keys(fieldCond).length) fieldConditions.push(fieldCond);
			}
		}

		// If multiple conditions for the same field, use explicit $and/$or
		// because andMerge can't handle duplicate paths (e.g., language=X AND language=Y)
		if (fieldConditions.length > 1) {
			const combined =
				groupLogic === "OR"
					? { $or: fieldConditions }
					: { $and: fieldConditions };
			conditions.push(combined);
		} else if (fieldConditions.length === 1) {
			conditions.push(fieldConditions[0]);
		}
	}

	// Handle event_composition_sent_status when event_composition is not present
	// In this case, filter by email_sent action only (without composition filter)
	if (
		hasEventCompositionSentStatus &&
		!hasEventComposition &&
		fieldGroups.event_composition_sent_status
	) {
		for (const instance of fieldGroups.event_composition_sent_status) {
			if (isFilterValuePresent(instance.value, instance.operator)) {
				const condition = buildEventCompositionSentStatusAloneCondition(
					instance.value,
				);
				if (condition) {
					conditions.push(condition);
				}
			}
		}
	}

	if (conditions.length === 0) return null;
	if (conditions.length === 1) return conditions[0];

	// Use explicit $and/$or for combining different fields
	return groupLogic === "OR" ? { $or: conditions } : { $and: conditions };
}

// merge list of objects with AND semantics
function andMerge(objs: any[]) {
	const acc: any = {};
	for (const o of objs) deepMerge(acc, o);
	return acc;
}

/* ----------------- main API ----------------- */

export function transformFilters<T extends Record<string, any>>(filters: T) {
	let shouldLogRootFilters = false;
	try {
		shouldLogRootFilters = JSON.stringify(filters || {}).includes(
			"subscriptions",
		);
	} catch {
		shouldLogRootFilters = true;
	}

	if (shouldLogRootFilters) {
		logSubscriptionFilter("transformFilters/input", { filters });
	}

	if (Array.isArray((filters as any).groups)) {
		// grouped path (contacts)
		const groups = (filters as any).groups as Array<{
			logic: "AND" | "OR";
			filters?: Record<string, any>;
		}>;
		const topLogic: "AND" | "OR" = (filters as any).groupLogic || "AND";

		const built = groups
			.map((g) => buildGroup(g.filters || {}, g.logic || "AND"))
			.filter(Boolean) as any[];

		if (built.length === 0) return {};
		if (built.length === 1) {
			if (shouldLogRootFilters) {
				logSubscriptionFilter("transformFilters/output_grouped", {
					output: built[0],
				});
			}
			return built[0];
		}
		const groupedOutput = topLogic === "OR" ? { $or: built } : { $and: built };
		if (shouldLogRootFilters) {
			logSubscriptionFilter("transformFilters/output_grouped", {
				output: groupedOutput,
			});
		}
		return groupedOutput;
	}

	// flat shape (orgs)
	const flat: Record<string, any> = filters as any;
	const conds: any[] = [];
	for (const [k, v] of Object.entries(flat)) {
		if (k.endsWith("_operator") || k.startsWith("$")) continue;
		if (v == null || v === "" || (Array.isArray(v) && v.length === 0)) continue;
		const op = flat[`${k}_operator`];
		conds.push(buildFieldCondition(k, v, op));
	}
	if (conds.length === 0) return {};
	const output = andMerge(conds);
	if (shouldLogRootFilters) {
		logSubscriptionFilter("transformFilters/output_flat", { output });
	}
	return output;
}

export function parseFormIntoUrlFilters<T extends Record<string, any>>(
	filters: T,
): string {
	const strapiFilters = transformFilters(filters as any);
	return qs.stringify({ filters: strapiFilters }, { encodeValuesOnly: true });
}

// delete this file --- IGNORE ---
export function parseQueryToFilterValues<T extends Record<string, any>>(
	searchParams: URLSearchParams,
): T {
	const parsed = qs.parse(searchParams.toString(), {
		ignoreQueryPrefix: true,
	}) as any;
	const rawFilters = (parsed.filters || {}) as Record<string, any>;
	const result: Record<string, any> = {};

	const flatten = (obj: any, prefix = "") => {
		for (const key of Object.keys(obj)) {
			const value = obj[key];
			const fullKey = prefix ? `${prefix}.${key}` : key;

			if (
				typeof value === "object" &&
				value !== null &&
				!Array.isArray(value) &&
				Object.keys(value).every((k) => k.startsWith("$"))
			) {
				const operator = Object.keys(value)[0];
				const val = value[operator];
				result[fullKey] = Array.isArray(val) ? val.join(",") : val;
				result[`${fullKey}_operator`] = operator;
			} else if (
				typeof value === "object" &&
				value !== null &&
				!Array.isArray(value)
			) {
				flatten(value, fullKey);
			} else {
				result[fullKey] = value;
			}
		}
	};
	flatten(rawFilters);
	return result as T;
}
