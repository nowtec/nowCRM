import type { Channel } from "./channel";
import type { BaseFormType, BaseType, DocumentId } from "./common/base_type";
import type { StrapiConnect } from "./common/StrapiQuery";
import type { Composition } from "./composition";
import type { Contact } from "./contact";
import type { Identity } from "./identity";
import type { Journey } from "./journey";
import type { JourneyPassedStep } from "./journey-passed-step";
import type { JourneyStepConnection } from "./journey-step-connection";

export type JourneyStepTypes =
	| "trigger"
	| "scheduler-trigger"
	| "channel"
	| "wait";

export type timingJourneyStepKeys = "delay" | "publish" | "none";
export interface JourneyTiming {
	type: timingJourneyStepKeys;
	value: number | Date;
}

export interface JourneyStep extends BaseType {
	contacts: Contact[];
	journey: Journey;
	channel: Channel;
	journey_passed_steps: JourneyPassedStep[];
	connections_to_this_step: JourneyStepConnection[];
	connections_from_this_step: JourneyStepConnection[];
	identity: Identity;
	additional_data: object;
	type: JourneyStepTypes;
	timing?: JourneyTiming;
	composition: Composition;
}

export interface Form_JourneyStep extends BaseFormType {
	contacts: StrapiConnect;
	journey: DocumentId;
	channel: DocumentId;
	journey_passed_steps: StrapiConnect;
	connections_to_this_step: StrapiConnect;
	connections_from_this_step: StrapiConnect;
	identity: DocumentId;
	additional_data: object;
	type: JourneyStepTypes;
	timing?: JourneyTiming;
	composition: DocumentId;
}
