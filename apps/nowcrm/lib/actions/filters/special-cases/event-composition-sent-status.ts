/**
 * Special case handler for event_composition_sent_status filter
 * This handles the combination of event_composition and event_composition_sent_status fields
 * to filter contacts based on whether they have events with email_sent action for a specific composition
 */

const isRelObject = (v: any) => v && typeof v === "object" && "value" in v;
const isRelArray = (v: any) =>
	Array.isArray(v) &&
	v.length > 0 &&
	v.every((x) => x && typeof x === "object" && "value" in x);

export interface FieldGroup {
	key: string;
	value: any;
	operator?: string;
}

function normalizeSentStatuses(value: any): Array<"sent" | "not_sent"> {
	if (Array.isArray(value)) {
		const normalized = value.filter(
			(v): v is "sent" | "not_sent" => v === "sent" || v === "not_sent",
		);
		return [...new Set(normalized)];
	}
	return value === "sent" || value === "not_sent" ? [value] : [];
}

/**
 * Checks if both event_composition and event_composition_sent_status are present in field groups
 */
export function hasEventCompositionSentStatusCombination(
	fieldGroups: Record<string, FieldGroup[]>,
): {
	hasEventComposition: boolean;
	hasEventCompositionSentStatus: boolean;
} {
	const hasEventComposition = fieldGroups.event_composition?.some(
		(inst) =>
			inst.value !== "" &&
			inst.value != null &&
			!(Array.isArray(inst.value) && inst.value.length === 0),
	);

	const hasEventCompositionSentStatus =
		fieldGroups.event_composition_sent_status?.some(
			(inst) =>
				inst.value !== "" &&
				inst.value != null &&
				normalizeSentStatuses(inst.value).length === 1,
		);

	return { hasEventComposition, hasEventCompositionSentStatus };
}

/**
 * Builds filter condition for event_composition when combined with event_composition_sent_status
 */
export function buildEventCompositionSentStatusCondition(
	compositionValue: any,
	sentStatusValue: string | string[],
): any | null {
	const statuses = normalizeSentStatuses(sentStatusValue);
	if (statuses.length !== 1) {
		return null;
	}
	const [normalizedStatus] = statuses;

	// Extract documentId from relation object (value property contains the ID)
	const compositionId = isRelObject(compositionValue)
		? compositionValue.value
		: isRelArray(compositionValue)
			? compositionValue.map((x: any) => x.value)
			: compositionValue;

	// Handle both single composition and multiple compositions
	const compositionFilter = Array.isArray(compositionId)
		? { composition: { documentId: { $in: compositionId } } }
		: { composition: { documentId: { $eq: compositionId } } };

	// Build condition based on event action field
	// Events with action = "email_sent" means the email was really sent
	// If contact doesn't have such event, they didn't get email sent
	if (normalizedStatus === "sent") {
		// Contacts that HAVE events with the selected composition AND action = "email_sent"
		return {
			events: {
				$and: [compositionFilter, { action: { $eqi: "send" } }],
			},
		};
	} else {
		// Contacts that DON'T HAVE events with the selected composition AND action = "email_sent"
		// This means they didn't receive the email for this composition
		return {
			$or: [
				{ events: { documentId: { $null: true } } },
				{ events: { composition: { documentId: { $not: compositionId } } } },
			],
		};
	}
}

/**
 * Builds filter condition for event_composition_sent_status when used alone (without composition)
 */
export function buildEventCompositionSentStatusAloneCondition(
	sentStatusValue: string | string[],
): any | null {
	const statuses = normalizeSentStatuses(sentStatusValue);
	if (statuses.length !== 1) {
		return null;
	}
	const [normalizedStatus] = statuses;

	if (normalizedStatus === "sent") {
		// Contacts that HAVE events with action = "email_sent"
		return {
			events: {
				action: { $eqi: "send" },
			},
		};
	} else {
		// Contacts that DON'T HAVE events with action = "email_sent"
		// This means they didn't receive any email sent events
		return {
			$not: {
				events: {
					action: { $eqi: "send" },
				},
			},
		};
	}
}
