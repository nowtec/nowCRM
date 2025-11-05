import type { DocumentId } from "../common/base_type";
import type { JourneyStepTypes, JourneyTiming } from "../journey-step";

export type delayedProcessorJobData = {
	jobId: string;
	contactId: DocumentId;
	stepId: DocumentId;
	journeyId: DocumentId;
	channel: DocumentId;
	compositionId: DocumentId;

	type: JourneyStepTypes;
	timing: JourneyTiming;
	ignoreSubscription?: boolean;
};
