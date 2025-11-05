import type { Action_ScoreItem } from "./action-score-item";
import type { ActionType } from "./action-type";
import type { Campaign } from "./campaign";
import type { BaseFormType, BaseType, DocumentId } from "./common/base_type";
import type { StrapiConnect } from "./common/StrapiQuery";
import type { Contact } from "./contact";
import type { JourneyStep } from "./journey-step";
export interface Action extends BaseType {
	entity: string;
	value: string;
	source: string;
	effort: string;
	partnership: string;
	external_id: string;
	/**
	 * structured data related to the action.
	 * Can include contextual details, metadata, or parameters
	 * needed to perform or describe the action.
	 *
	 * Example:
	 * {
	 *   userId: "abc123",
	 *   timestamp: "2025-10-29T10:30:00Z",
	 *   extra: { key: "value" }
	 * }
	 * can accept json string or object
	 */
	payload: object | string;
	action_type: ActionType;
	contact: Contact;
	journey_step: JourneyStep;
	campaign: Campaign;
	score_items: Action_ScoreItem[];
}

export interface Form_Action extends BaseFormType {
	entity: string;
	value: string;
	source: string;
	effort: string;
	partnership: string;
	external_id: string;
	/**
	 * structured data related to the action.
	 * Can include contextual details, metadata, or parameters
	 * needed to perform or describe the action.
	 *
	 * Example:
	 * {
	 *   userId: "abc123",
	 *   timestamp: "2025-10-29T10:30:00Z",
	 *   extra: { key: "value" }
	 * }
	 * can accept json string or object
	 */
	payload: object | string;
	action_type: DocumentId;
	contact: DocumentId;
	journey_step: DocumentId;
	campaign: DocumentId;
	score_items: StrapiConnect;
}
