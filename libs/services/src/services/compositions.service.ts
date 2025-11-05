import { API_ROUTES_COMPOSER } from "../api-routes/api-routes-composer";
import { API_ROUTES_STRAPI } from "../api-routes/api-routes-strapi";
import { envServices } from "../envConfig";
import { DocumentId } from "../types/common/base_type";
import type { composerSendType } from "../types/composer/composer-send-types";
import type { createAdditionalComposition } from "../types/composer/create-additional-composition";
import type { createComposition } from "../types/composer/create-composition";
import type { QuickWriteModel } from "../types/composer/quick-write-model";
import type { ReferenceComposition } from "../types/composer/reference-composition";
import type { Composition, Form_Composition, JobCompositionRecord, StructuredResponseModel } from "../types/composition";
import type { Contact } from "../types/contact";
import type { JourneyStep } from "../types/journey-step";
import type { ServiceResponse } from "../types/microservices/service-response";
import BaseService from "./common/base.service";
import {
	handleError,
	handleResponse,
	type StandardResponse,
} from "./common/response.service";
import { journeyStepsService } from "./journey-steps.service";

class CompositionsService extends BaseService<Composition, Form_Composition> {
	public constructor() {
		super(API_ROUTES_STRAPI.COMPOSITIONS);
	}

	async createReference(
		data: ReferenceComposition,
	): Promise<StandardResponse<{ result: string }>> {
		try {
			const url = `${envServices.COMPOSER_URL}${API_ROUTES_COMPOSER.CREATE_REFERENCE}`;
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
			const url = `${envServices.COMPOSER_URL}${API_ROUTES_COMPOSER.COMPOSER_QUICK_WRITE}`;
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
			const url = `${envServices.COMPOSER_URL}${API_ROUTES_COMPOSER.COMPOSER_REGENERATE}`;
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

	async createComposition(
		data: createComposition,
	): Promise<StandardResponse<string>> {
		try {
			const url = `${envServices.COMPOSER_URL}${API_ROUTES_COMPOSER.CREATE_COMPOSITION}`;
			const res = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				cache: "no-store",
				body: JSON.stringify(data),
			});
			const response = (await res.json()) as ServiceResponse<{
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
			const url = `${envServices.STRAPI_URL}${API_ROUTES_STRAPI.COMPOSITION_DUPLICATE}`;

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

	async sendComposition(
		token: string,
		step: JourneyStep,
		contact: Contact,
		type: composerSendType,
		ignoreSubscription?: boolean,
	): Promise<StandardResponse<null>> {
		let passed_step = false;
		if (!step.composition) {
			return {
				errorMessage: "Step is missing composition",
				data: null,
				status: 400,
				success: false,
			};
		}

		const payload = {
			composition_id: step.composition.id,
			channels: [step.channel?.name.toLowerCase()],
			to: contact.email,
			type: type,
			subject: step.composition.subject || step.composition.name,
			from: step.identity.name,
			ignoreSubscription,
		};

		passed_step = (
			await journeyStepsService.checkPassedStep(
				token,
				step.id,
				contact.id,
				step.composition.id,
			)
		).data as boolean;

		if (!passed_step) {
			const base = envServices.COMPOSER_URL;
			const url = new URL(API_ROUTES_COMPOSER.SEND_TO_CHANNELS, base);

			const response = await fetch(url, {
				method: "POST",
				headers: {
					"content-type": "application/json",
					accept: "application/json",
				},
				body: JSON.stringify(payload),
			});
			const data = (await response.json()) as ServiceResponse<null>;

			if (!data.success) {
				return {
					errorMessage: `Failed to send composition:${data.message} - ${data.statusCode}`,
					data: null,
					status: data.statusCode,
					success: false,
				};
			}

			return {
				data: null,
				status: data.statusCode,
				success: true,
			};
		}

		return {
			data: null,
			status: 200,
			success: true,
		};
	}

	async requestStructuredResponse(
		data: StructuredResponseModel,
	): Promise<StandardResponse<{ result: string }>> {

		try {
			const url = `${envServices.COMPOSER_URL}${API_ROUTES_COMPOSER.COMPOSER_STRUCTURED_RESPONSE}`;
			const response = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				cache: "no-store",
				body: JSON.stringify(data),
			});
			const json = (await response.json()) as ServiceResponse<{
				result: string;
			}>;

			return {
				data: json.responseObject,
				status: json.statusCode,
				success: json.success,
				errorMessage: json.message,
			};
		} catch (error: any) {
			return handleError(error);
		}
	}

	public async getCompositionJobsData(
		page = 1,
		jobsPerPage = 20,
	): Promise<StandardResponse<JobCompositionRecord[]>> {

		try {
			const host = envServices.COMPOSER_URL.replace(/\/+$/, "");

			const listUrl =
				`${host}/admin/queues/api/queues` +
				`?activeQueue=massSendQueue&status=latest` +
				`&page=${page}&jobsPerPage=${jobsPerPage}`;

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
			if (!Array.isArray(jobsRaw)) throw new Error("‘jobs’ isn’t an array");
			const result: JobCompositionRecord[] = [];
			for (const job of jobsRaw) {
				const logsUrl = `${host}/admin/queues/api/queues/${compQueue.name}/${job.id}/logs`;
				let logsArray: any[] = [];
				try {
					const logsRes = await fetch(logsUrl, {
						cache: "no-store",
						credentials: "include",
						headers: { Accept: "application/json" },
					});
					if (logsRes.ok) {
						const logsJson = await logsRes.json() as any; 
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
