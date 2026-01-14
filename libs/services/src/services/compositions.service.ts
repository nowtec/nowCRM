import { API_ROUTES_COMPOSER } from "../api-routes/api-routes-composer";
import { API_ROUTES_STRAPI } from "../api-routes/api-routes-strapi";
import { envServices } from "../env-config";
import type { DocumentId } from "../types/common/base-type";
import type { createAdditionalComposition } from "../types/composer/create-additional-composition";
import type { QuickWriteModel } from "../types/composer/quick-write-model";
import type { ReferenceComposition } from "../types/composer/reference-composition";
import type {
	Composition,
	Form_Composition,
	JobCompositionRecord,
} from "../types/composition";
import type { ServiceResponse } from "../types/microservices/service-response";
import BaseService from "./common/base.service";
import {
	handleError,
	handleResponse,
	type StandardResponse,
} from "./common/response.service";

class CompositionsService extends BaseService<Composition, Form_Composition> {
	public constructor() {
		super(API_ROUTES_STRAPI.COMPOSITIONS);
	}

	async createReference(
		data: ReferenceComposition,
	): Promise<StandardResponse<{ result: string }>> {
		try {
			const url = new URL(
				API_ROUTES_COMPOSER.CREATE_REFERENCE,
				envServices.API_GATEWAY,
			);
			const response = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				cache: "no-store",
				body: JSON.stringify(data),
			});
			const reference = (await response.json()) as ServiceResponse<{
				result: string;
			}>;
			return {
				data: reference.responseObject,
				status: reference.statusCode,
				success: reference.success,
				errorMessage: reference.message,
			};
		} catch (error: any) {
			console.log(error);
			return handleError(error);
		}
	}

	async quickWrite(
		data: QuickWriteModel,
	): Promise<StandardResponse<{ result: string }>> {
		try {
			const url = new URL(
				API_ROUTES_COMPOSER.COMPOSER_QUICK_WRITE,
				envServices.API_GATEWAY,
			);
			const response = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				cache: "no-store",
				body: JSON.stringify(data),
			});
			const reference = (await response.json()) as ServiceResponse<{
				result: string;
			}>;
			return {
				data: reference.responseObject,
				status: reference.statusCode,
				success: reference.success,
				errorMessage: reference.message,
			};
		} catch (error: any) {
			return handleError(error);
		}
	}

	async regenerateItemResult(
		data: createAdditionalComposition,
	): Promise<StandardResponse<string>> {
		try {
			const url = new URL(
				API_ROUTES_COMPOSER.COMPOSER_REGENERATE,
				envServices.API_GATEWAY,
			);
			const rez = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				cache: "no-store",
				body: JSON.stringify(data),
			});
			const response = (await rez.json()) as ServiceResponse<{
				result: string;
			}>;
			return {
				data: response.responseObject.result,
				status: response.statusCode,
				success: response.success,
				errorMessage: response.message,
			};
		} catch (error: any) {
			return handleError(error);
		}
	}

	async duplicate(
		compositionId: DocumentId,
		token: string,
	): Promise<StandardResponse<null>> {
		try {
			const url = new URL(
				`api/${API_ROUTES_STRAPI.COMPOSITION_DUPLICATE}`,
				envServices.API_GATEWAY,
			);

			const response = await fetch(url, {
				method: "POST",
				headers: this.getHeaders(true, token),
				body: JSON.stringify({ id: compositionId }),
			});

			const result = await handleResponse<null>(response);
			return result;
		} catch (error: any) {
			return handleError(error);
		}
	}

	public async getCompositionJobsData(
		page = 1,
		jobsPerPage = 20,
	): Promise<StandardResponse<JobCompositionRecord[]>> {
		try {
			const host = envServices.API_GATEWAY.replace(/\/+$/, "");

			const listUrl = new URL("/admin/queues/api/queues", host);
			listUrl.searchParams.set("activeQueue", "massSendQueue");
			listUrl.searchParams.set("status", "latest");
			listUrl.searchParams.set("page", page.toString());
			listUrl.searchParams.set("jobsPerPage", jobsPerPage.toString());

			const listRes = await fetch(listUrl, {
				cache: "no-store",
				credentials: "include",
				headers: { Accept: "application/json" },
			});
			if (!listRes.ok) throw new Error(`HTTP ${listRes.status}`);
			const rawText = await listRes.text();

			const contentType = listRes.headers.get("content-type") || "";
			if (!contentType.includes("application/json")) {
				throw new Error("Expected JSON");
			}
			const parsed = JSON.parse(rawText);
			const queues = parsed.queues;
			if (!Array.isArray(queues)) throw new Error("‘queues’ isn’t an array");

			const compQueue = queues.find((q: any) => q.name === "massSendQueue");
			if (!compQueue) {
				return { data: [], status: 200, success: true };
			}

			const jobsRaw = compQueue.jobs;
			if (!Array.isArray(jobsRaw)) throw new Error("'jobs' isn't an array");
			const result: JobCompositionRecord[] = [];
			for (const job of jobsRaw) {
				const logsUrl = new URL(
					`/admin/queues/api/queues/${compQueue.name}/${job.id}/logs`,
					host,
				);
				let logsArray: any[] = [];
				try {
					const logsRes = await fetch(logsUrl, {
						cache: "no-store",
						credentials: "include",
						headers: { Accept: "application/json" },
					});
					if (logsRes.ok) {
						const logsJson = (await logsRes.json()) as any;
						if (Array.isArray(logsJson)) {
							logsArray = logsJson;
						} else if (Array.isArray(logsJson.logs)) {
							logsArray = logsJson.logs;
						}
					} else {
						console.warn(
							`[WARN] Logs fetch for job ${job.id} returned HTTP ${logsRes.status}`,
						);
					}
				} catch (err) {
					console.error(`[ERROR] Failed to fetch logs for job ${job.id}:`, err);
				}

				const logsFailures = logsArray
					.map((l: any) =>
						typeof l === "string"
							? l
							: l.message
								? `${new Date(
										l.timestamp ?? job.timestamp,
									).toLocaleString()}: ${l.message}`
								: JSON.stringify(l),
					)
					.join("\n");

				const { data, composition } = job.data;
				const items = Array.isArray(composition.composition_items)
					? composition.composition_items
					: [];

				result.push({
					id: job.id,
					name: composition.name ?? job.id,
					createdAt: new Date(job.timestamp).toISOString(),
					status: job.finishedOn
						? "completed"
						: job.processedOn
							? "active"
							: "waiting",
					type: data.type,
					progressPercent: job.progress ?? 0,
					jobId: job.id,
					channels: data.channels,
					result: items.map((i: any) => i.result).join("\n"),
					composition_id: composition.id,
					from: data.from,
					title: data.title,
					to: data.to,
					subject: data.subject,
					publicationDate: items[0]?.publication_date ?? null,
					logs: logsFailures,
				});
			}

			return { data: result, status: 200, success: true };
		} catch (error: any) {
			return handleError(error);
		}
	}
}

export const compositionsService = new CompositionsService();
