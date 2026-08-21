import { ServiceResponse } from "@nowcrm/services";
import { env } from "@/common/utils/env-config";
import { getProgress } from "@/jobs_pipeline/common/helpers/progress-tracker";

/** Written by the contacts worker; see logFailedContacts in contacts-worker.ts. */
const CONTACTS_MARKER = "Failed contacts:";

/**
 * The queued job only parses the CSV and fans out batches, so its own state
 * says nothing about how far the import got. Prefer the batch counters the
 * workers keep, and fall back to the job's own state for imports that ran
 * before those counters existed or whose keys have since expired.
 */
function deriveStatus(
	job: any,
	progress: { total: number; completed: number },
): string {
	if (job.isFailed) return "failed";

	if (progress.total > 0) {
		return progress.completed >= progress.total ? "completed" : "processing";
	}

	if (job.finishedOn) return "completed";
	if (job.processedOn) return "processing";
	return "queued";
}

function prettifyOp(op: string): string {
	const map: Record<string, string> = {
		$containsi: "contains",
		$eq: "equals",
		$ne: "not equals",
		$in: "in",
		$gt: ">",
		$lt: "<",
		$gte: ">=",
		$lte: "<=",
		$regex: "matches",
	};
	return map[op] || op;
}

function parseSearchMaskToString(mask: any): string {
	if (!mask || typeof mask !== "object") return "No filters";

	const result: string[] = [];

	function recurse(obj: any, _prefix = "") {
		for (const key in obj) {
			const value = obj[key];

			if (typeof value === "object" && value !== null) {
				// if it's an operator-object like { $containsi: "CEO" }
				const operators = Object.entries(value)
					.map(([op, val]) => `${prettifyOp(op)} "${val}"`)
					.join(", ");

				result.push(`${key} ${operators}`);
			} else {
				result.push(`${key}: "${value}"`);
			}
		}
	}

	recurse(mask);

	return result.length ? `filtered by: ${result.join(", ")}` : "No filters";
}

class QueueServiceApi {
	public async getQueueData(query: any) {
		const baseUrl = `http://${env.DAL_HOST}:${env.DAL_PORT}`;

		try {
			const page = Number.parseInt(query.page as string, 10) || 1;
			const jobsPerPage =
				Number.parseInt(query.jobsPerPage as string, 10) || 20;

			const type = (query.type as string)?.toLowerCase() || "contacts";
			let queueName = "csvContactsQueue";
			if (type === "organizations") {
				queueName = "csvOrganizationsQueue";
			} else if (type === "mass-actions") {
				queueName = "csvMassActionsQueue";
			}

			const params = new URLSearchParams({
				activeQueue: queueName,
				status: "latest",
				page: String(page),
				jobsPerPage: String(jobsPerPage),
			});

			// Bull Board is mounted without auth, so its API is called directly.
			const response = await fetch(
				`${baseUrl}/admin/queues/api/queues?${params}`,
			);

			if (!response.ok)
				throw new Error(`Failed to load queues: ${response.statusText}`);
			const data = await response.json();

			const queues = data?.queues || [];
			const csvQueue = queues.find((q: any) => q.name === queueName);

			if (!csvQueue) {
				console.warn(`Queue '${queueName}' not found in list.`);
			}

			const jobs = csvQueue?.jobs || [];

			const formattedJobs = await Promise.all(
				jobs.map(async (job: any, _index: number) => {
					const progress = await getProgress(String(job.id));

					const jobInfo = {
						id: job.id,
						filename: job.data?.filename || "Unknown File",
						createdAt: new Date(job.timestamp).toLocaleString(),
						status: deriveStatus(job, progress),
						progressPercent: progress.percent,
						type: job.data?.type,
						massAction: job.data?.mass_action || null,
						listName: job.data?.list_name || null,
						typeField: job.data?.typeField || null,
						searchMask: job.data?.searchMask || null,
						parsedSearchMask: parseSearchMaskToString(job.data?.searchMask),
						logs: [] as string[],
						failedContacts: [] as Array<Record<string, any>>,
						failedOrgs: [] as { name: string; reason: string }[],
					};

					try {
						const logsRes = await fetch(
							`${baseUrl}/admin/queues/api/queues/${queueName}/${job.id}/logs`,
						);

						if (!logsRes.ok)
							throw new Error(`Failed to fetch logs: ${logsRes.statusText}`);

						const logsData = await logsRes.json();

						const logs = Array.isArray(logsData)
							? logsData
							: logsData?.logs || [];

						jobInfo.logs = logs;

						const orgReasonMap = new Map<string, string>();

						logs.forEach((line: string) => {
							const orgMatch = line.match(
								/failed org:\s*(.+?)\s+—\s+reason:\s*(.+)$/i,
							);
							if (orgMatch)
								orgReasonMap.set(orgMatch[1].trim(), orgMatch[2].trim());
						});

						const csvContacts: Array<Record<string, any>> = [];
						for (const line of logs) {
							if (typeof line !== "string") continue;
							const at = line.indexOf(CONTACTS_MARKER);
							if (at === -1) continue;

							try {
								const parsed = JSON.parse(
									line.slice(at + CONTACTS_MARKER.length).trim(),
								);
								if (Array.isArray(parsed)) csvContacts.push(...parsed);
							} catch {
								console.warn(
									`Could not parse a failed-contacts block on job ${job.id}`,
								);
							}
						}

						jobInfo.failedContacts = csvContacts;

						let csvOrgs: { name: string; reason: string }[] = [];

						const failedOrgsBlock = logs.find((line: any) =>
							line.includes("Failed organizations:"),
						);
						if (failedOrgsBlock) {
							const start = failedOrgsBlock.indexOf("[");
							const end = failedOrgsBlock.lastIndexOf("]");

							if (start !== -1 && end !== -1 && end > start) {
								let jsonText = failedOrgsBlock.slice(start, end + 1);

								jsonText = jsonText
									.replace(/:\s*\[object Object\]/g, ': "[object Object]"')
									.replace(/,(\s*])/g, "$1");

								try {
									const arr = JSON.parse(jsonText);
									if (Array.isArray(arr)) {
										csvOrgs = arr.map((org: any) => {
											const name = org.name || "unnamed";

											let reason: string;
											if (typeof org.error === "string") {
												reason = org.error;
											} else if (org.error?.error?.message) {
												reason = org.error.error.message;
											} else {
												reason = "[no reason]";
											}

											return { name, reason };
										});
									}
								} catch (e) {
									console.warn("Can't parse Json:", e);
									csvOrgs = Array.from(orgReasonMap.entries()).map(
										([origName, rsn]) => ({
											name: origName,
											reason: String(rsn),
										}),
									);
								}
							}
						}
						jobInfo.failedOrgs = csvOrgs;
					} catch (logError: any) {
						console.error(
							`Failed to fetch logs for job ${job.id}:`,
							logError.message,
						);
						jobInfo.logs = [`Failed to fetch logs: ${logError.message}`];
					}

					return jobInfo;
				}),
			);

			return ServiceResponse.success("Queue data retrieved", {
				jobs: formattedJobs,
			});
		} catch (error: any) {
			console.error("Failed to fetch queue data:", error.message);
			console.error("Stack:", error.stack);
			return ServiceResponse.failure(
				error.message,
				null,
				error.response?.status || 500,
			);
		}
	}
}

export const queueServiceApi = new QueueServiceApi();
