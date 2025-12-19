import type { BaseFormType, BaseType, DocumentId } from "./common/base-type";
import type { StrapiConnect } from "./common/strapi-query";
import type { JourneyStepConnection } from "./journey-step-connection";
import type { JourneyStepRuleScore } from "./journey-step-rule-score";
export interface JourneyStepRule extends Omit<BaseType, "name"> {
	label: string;
	condition: string;
	journey_step_connection: JourneyStepConnection;
	condition_enity: string;
	condition_operator: string;
	condition_value: string;
	journey_step_rule_scores: JourneyStepRuleScore[];
	ready_condition: string;
	additional_condition: string;
	additional_data: object | string;
}

export interface Form_JourneyStepRule extends Omit<BaseFormType, "name"> {
	label: string;
	condition: string;
	journey_step_connection: DocumentId;
	condition_enity: string;
	condition_operator: string;
	condition_value: string;
	journey_step_rule_scores: StrapiConnect;
	ready_condition: string;
	additional_condition: string;
	additional_data: object | string;
}
