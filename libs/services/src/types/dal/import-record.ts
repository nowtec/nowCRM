/**
 * A CSV row the import rejected, carrying whatever columns that row had so it
 * can be downloaded, corrected and re-imported.
 */
export interface FailedContact {
	email?: string;
	[field: string]: unknown;
}

export interface ImportRecord {
	id: string;
	filename: string;
	createdAt: string;
	status: string;
	progressPercent?: number;
	failedContacts?: FailedContact[];
	failedOrgs?: FailedOrg[];
	jobId: string;
	type?: string;
	massAction?: string | null;
	listName?: string | null;
	typeField?: string | null;
	parsedSearchMask?: string;
}

export interface FailedOrg {
	name: string;
	reason: string;
}
