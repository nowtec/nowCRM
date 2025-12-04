import { API_ROUTES_COMPOSER } from "../../api-routes/api-routes-composer";
import type {
	createComposition,
	StructuredResponseModel,
	sendToChannelsData,
} from "../../client";
import { envServices } from "../../env-config";
import type { DocumentId } from "../../types/common/base-type";

import type { ServiceResponse } from "../../types/microservices/service-response";
import { handleError, type StandardResponse } from "../common/response.service";
import { journeyStepsService } from "../journey-steps.service";

class ComposerService {
	async sendCompositionByFilters(
		filters: Record<string, any>,
		compositionId: DocumentId,
		channelNames: string[],
		subject: string,
		from: string,
		interval: number,
	): Promise<StandardResponse<any>> {
		try {
			const payload = {
				composition_id: compositionId,
				entity: "contacts",
				searchMask: filters,
				type: "contact",
				channels: channelNames.map((c) => c.toLowerCase()),
				subject,
				from,
				interval,
			};

			console.log(
				">>> Send composition by filters payload:",
				JSON.stringify(payload, null, 2),
			);

			const res = await fetch(
				//send to channels hadnle both standard and mass actions
				`${envServices.COMPOSER_URL}${API_ROUTES_COMPOSER.SEND_TO_CHANNELS}`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(payload),
				},
			);

			const raw = await res.text();
			if (!res.ok) {
				return {
					data: null,
					status: res.status,
					success: false,
					errorMessage: `Server returned ${res.status}: ${raw}`,
				};
			}

			const contentType = res.headers.get("content-type") || "";
			if (!contentType.includes("application/json")) {
				return {
					data: null,
					status: res.status,
					success: false,
					errorMessage: `Unexpected content-type: ${contentType}, body: ${raw}`,
				};
			}

			const data = JSON.parse(raw);
			return { data, status: res.status, success: true };
		} catch (error: any) {
			return {
				data: null,
				status: 500,
				success: false,
				errorMessage: error.message,
			};
		}
	}

	async sendComposition(
		payload: sendToChannelsData,
		journeys_data?: {
			stepId: DocumentId;
			contactId: DocumentId;
			token: string;
			compositionId: DocumentId;
		},
	): Promise<StandardResponse<null>> {
		try {
			const base = envServices.COMPOSER_URL;
			const url = new URL(API_ROUTES_COMPOSER.SEND_TO_CHANNELS, base);

			if (journeys_data?.stepId) {
				const check = await journeyStepsService.checkPassedStep(
					journeys_data.token,
					journeys_data.stepId,
					journeys_data.contactId,
					journeys_data.compositionId,
				);
				if (!check.success) {
					return {
						errorMessage: check.errorMessage,
						data: null,
						status: check.status,
						success: false,
					};
				}
				if (check.data)
					return {
						data: null,
						status: 200,
						success: true,
					};
			}

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
				data: data.responseObject,
				status: data.statusCode,
				success: data.success,
				errorMessage: data.message,
			};
		} catch (error: any) {
			return handleError(error);
		}
	}

	async createComposition(
		data: Partial<createComposition>,
	): Promise<StandardResponse<DocumentId>> {
		try {
			const base = envServices.COMPOSER_URL;
			const url = new URL(API_ROUTES_COMPOSER.CREATE_COMPOSITION, base);

			const response = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				cache: "no-store",
				body: JSON.stringify(data),
			});
			const res_data = (await response.json()) as ServiceResponse<{
				id: DocumentId;
			}>;
			return {
				data: res_data.responseObject.id,
				status: 200,
				success: true,
			};
		} catch (_error: any) {
			return handleError(_error);
		}
	}

	async sendCompositionByIds(
		contactIds: DocumentId[],
		compositionId: DocumentId,
		channelNames: string[],
		subject: string,
		from: string,
		interval: number,
	): Promise<StandardResponse<any>> {
		try {
			const payload = {
				composition_id: compositionId,
				to: contactIds,
				type: "contact",
				channels: channelNames.map((c) => c.toLowerCase()),
				subject,
				from,
				interval,
			};

			console.log(
				">>> Send to channels payload:",
				JSON.stringify(payload, null, 2),
			);

			const res = await fetch(
				`${envServices.COMPOSER_URL}${API_ROUTES_COMPOSER.SEND_TO_CHANNELS}`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(payload),
				},
			);

			const raw = await res.text();
			if (!res.ok) {
				return {
					data: null,
					status: res.status,
					success: false,
					errorMessage: `Server returned ${res.status}: ${raw}`,
				};
			}

			const contentType = res.headers.get("content-type") || "";
			if (!contentType.includes("application/json")) {
				return {
					data: null,
					status: res.status,
					success: false,
					errorMessage: `Unexpected content-type: ${contentType}, body: ${raw}`,
				};
			}

			const data = JSON.parse(raw);
			return { data, status: res.status, success: true };
		} catch (error: any) {
			return {
				data: null,
				status: 500,
				success: false,
				errorMessage: error.message,
			};
		}
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
}

export const composerService = new ComposerService();
