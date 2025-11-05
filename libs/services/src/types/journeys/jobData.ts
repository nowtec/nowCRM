//here we handle only ids because we will fetch data from backend when starting the job

import type { DocumentId } from "../common/base_type";
import type { JourneyTiming } from "../journey-step";

//it will help to handle all data always up to date and updated
export type JobData = {
	journey: DocumentId;
	contact: DocumentId;
	journey_step: DocumentId;
	composition: DocumentId;
	channel: DocumentId;
	timing?: JourneyTiming;
};

export type JobDataRedis = {
	jobId: string;
	contactId: DocumentId;
	journeyId: DocumentId;
	stepId: DocumentId;
	compositionId: DocumentId;
	timing?: JourneyTiming;
	createdAt: Date;
	channel: DocumentId;
	ruleCheck: boolean;
	jobDataWorker: JobData;
};
