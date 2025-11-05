import type { DocumentId } from "../common/base_type";

export type ruleProcessorJobData = {
	jobId: string;
	contactId: DocumentId;
	stepId: DocumentId;
};
