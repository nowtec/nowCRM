import type { BaseFormType, BaseType, DocumentId } from "./common/base_type";
import type { StrapiConnect } from "./common/StrapiQuery";
import type { JourneyStep } from "./journey-step";
import type { JourneyStepRule } from "./journey-step-rule";

export type JourneyStepConnectionConditionType = "all" | "any";
export interface JourneyStepConnection extends Omit<BaseType, "name"> {
	priority: number;
	condition_type: JourneyStepConnectionConditionType;
	target_step: JourneyStep;
	source_step: JourneyStep;
	journey_step_rules: JourneyStepRule[];
}

export interface Form_JourneyStepConnection extends Omit<BaseFormType, "name"> {
	priority: number;
	condition_type: JourneyStepConnectionConditionType;
	target_step: DocumentId;
	source_step: DocumentId;
	journey_step_rules: StrapiConnect;
}
