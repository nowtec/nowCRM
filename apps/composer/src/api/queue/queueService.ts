// queueService.ts

import { ServiceResponse } from "@nowcrm/services";
import fetchCookie from "fetch-cookie";
import { CookieJar } from "tough-cookie";
import { env } from "@/common/utils/envConfig";

interface GetQueueDataParams {
	activeQueue: string;
	status: string;
	page?: string;
	jobsPerPage?: string;
}

class QueueServiceApi {
	public async getQueueData(params: GetQueueDataParams) {
		const jar = new CookieJar();
		const client = fetchCookie(fetch, jar);
		const baseUrl = `http://${env.COMPOSER_HOST}:${env.COMPOSER_PORT}`;

		const page = Number.parseInt(params.page ?? "1", 10);
		const jobsPerPage = Number.parseInt(params.jobsPerPage ?? "10", 10);
		const queueName = params.activeQueue;
		const status = params.status;

		try {
			const loginRes = await client(`${baseUrl}/login`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					username: env.COMPOSER_BASIC_AUTH_USERNAME,
					password: env.COMPOSER_BASIC_AUTH_PASSWORD,
				}),
			});
			if (!loginRes.ok) {
				throw new Error(
					`Login failed: ${loginRes.status} ${loginRes.statusText}`,
				);
			}

			const queuesUrl = new URL(`${baseUrl}/admin/queues/api/queues`);
			queuesUrl.searchParams.set("activeQueue", queueName);
			queuesUrl.searchParams.set("status", status);
			queuesUrl.searchParams.set("page", page.toString());
			queuesUrl.searchParams.set("jobsPerPage", jobsPerPage.toString());

			const queuesRes = await client(queuesUrl.toString(), { method: "GET" });
			if (!queuesRes.ok) {
				throw new Error(
					`Fetch queues failed: ${queuesRes.status} ${queuesRes.statusText}`,
				);
			}
			const queuesData: any = await queuesRes.json();
			const queues = queuesData.queues || [];
			const compositionQueue = queues.find(
				(q: any) => q.name === queueName,
			) || { jobs: [] };
			const jobs = compositionQueue.jobs as any[];

			const formattedJobs = await Promise.all(
				jobs.map(async (job: any) => {
					const jobInfo: any = {
						id: job.id,
						filename: job.data?.composition?.name || "Unknown",
						createdAt: new Date(job.timestamp).toISOString(),
						type: job.data?.type ?? null,
						channel: job.data?.channel,
						compositionId: job.data?.composition_id,
						subject: job.data?.subject,
						from: job.data?.from,
						recipients: job.data?.to || [],
						compositionName: job.data?.composition?.name,
						compositionStatus: job.data?.composition?.status,
						language: job.data?.composition?.language,
						persona: job.data?.composition?.persona,
						logs: [] as string[],
					};

					try {
						const logsRes = await client(
							`${baseUrl}/admin/queues/api/queues/${queueName}/${job.id}/logs`,
							{ method: "GET" },
						);
						if (logsRes.ok) {
							const logsJson = await logsRes.json();
							jobInfo.logs = Array.isArray(logsJson)
								? logsJson
								: logsJson.logs || [];
						} else {
							jobInfo.logs = [`Failed to fetch logs: ${logsRes.statusText}`];
						}
					} catch (logErr: any) {
						jobInfo.logs = [`Error fetching logs: ${logErr.message}`];
					}

					return jobInfo;
				}),
			);

			return ServiceResponse.success("Queue data retrieved", {
				jobs: formattedJobs,
			});
		} catch (error: any) {
			return ServiceResponse.failure(
				error.message,
				null,
				error.response?.status || 500,
			);
		}
	}
}

export const queueServiceApi = new QueueServiceApi();
