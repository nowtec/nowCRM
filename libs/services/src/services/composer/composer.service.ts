import { API_ROUTES_COMPOSER } from "../../api-routes/api-routes-composer";
import type {
	createComposition,
	StructuredResponseModel,
	sendToChannelsData,
} from "../../client";
import { envServices } from "../../env-config";
import type { DocumentId } from "../../types/common/base-type";

import type { ServiceResponse } from "../../types/microservices/service-response";
import { authHeaders } from "../common/base.service";
import {
	handleError,
	parseGatewayError,
	type StandardResponse,
} from "../common/response.service";
import { journeyStepsService } from "../journey-steps.service";

class ComposerService {
	async sendCompositionByFilters(
		filters: Record<string, any>,
		compositionId: DocumentId,
		channelNames: string[],
		subject: string,
		from: string,
		interval: number,
		token: string,
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

			const url = new URL(
				API_ROUTES_COMPOSER.SEND_TO_CHANNELS,
				envServices.API_GATEWAY,
			);
			const res = await fetch(url, {
				method: "POST",
				headers: authHeaders(token),
				body: JSON.stringify(payload),
			});

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
			const gatewayError = parseGatewayError(data, res.status);
			if (gatewayError) {
				return {
					data: null,
					status: gatewayError.status,
					success: false,
					errorMessage: gatewayError.message,
				};
			}

			return { data, status: res.status, success: true };
		} catch (error: any) {
			return handleError(error);
		}
	}

	async sendComposition(
		payload: sendToChannelsData,
		token: string,
		journeys_data?: {
			stepId: DocumentId;
			contactId: DocumentId;
			token: string;
			compositionId: DocumentId;
		},
	): Promise<StandardResponse<null>> {
		try {
			const base = envServices.API_GATEWAY;
			const url = new URL(API_ROUTES_COMPOSER.SEND_TO_CHANNELS, base);
			const payloadLogSummary = {
				composition_id: payload.composition_id,
				channels: payload.channels,
				type: payload.type,
				toType: Array.isArray(payload.to) ? "array" : typeof payload.to,
				toCount: Array.isArray(payload.to) ? payload.to.length : undefined,
				toPreview:
					typeof payload.to === "string" || typeof payload.to === "number"
						? payload.to
						: undefined,
				hasAccount: !!payload.account,
				unipileAccountId: payload.account?.account_id,
				interval: payload.interval,
				throttle: payload.throttle,
			};

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

			console.info(
				"[ComposerService.sendComposition] Sending request to composer",
				{
					url: url.toString(),
					payload: payloadLogSummary,
					hasJourneysContext: !!journeys_data,
				},
			);

			const headers = authHeaders(token);
			headers.append("Accept", "application/json");

			const response = await fetch(url, {
				method: "POST",
				headers,
				body: JSON.stringify(payload),
			});
			const rawBody = await response.text();
			let parsedBody: unknown = null;

			try {
				parsedBody = rawBody ? JSON.parse(rawBody) : null;
			} catch (parseError: any) {
				console.error(
					"[ComposerService.sendComposition] Failed to parse composer response JSON",
					{
						status: response.status,
						statusText: response.statusText,
						parseError: parseError?.message || String(parseError),
						rawBody,
						payload: payloadLogSummary,
					},
				);
				return {
					errorMessage: `Failed to send composition: invalid JSON response from composer (${response.status})`,
					data: null,
					status: response.status || 500,
					success: false,
				};
			}

			const gatewayError = parseGatewayError(parsedBody, response.status);
			if (gatewayError) {
				console.error(
					"[ComposerService.sendComposition] Gateway rejected the request",
					{
						httpStatus: response.status,
						upstreamStatus: gatewayError.status,
						upstreamMessage: gatewayError.message,
						payload: payloadLogSummary,
					},
				);
				return {
					errorMessage: `Failed to send composition: ${gatewayError.message} - ${gatewayError.status}`,
					data: null,
					status: gatewayError.status,
					success: false,
				};
			}

			const data = (parsedBody || {}) as Partial<ServiceResponse<null>> & {
				error?: { message?: string; status?: number };
				errorMessage?: string;
				status?: number;
			};
			const responseStatus =
				typeof data.statusCode === "number"
					? data.statusCode
					: typeof data.status === "number"
						? data.status
						: typeof data.error?.status === "number"
							? data.error.status
							: response.status;
			const responseMessage =
				(typeof data.message === "string" && data.message) ||
				(typeof data.errorMessage === "string" && data.errorMessage) ||
				(typeof data.error?.message === "string" && data.error.message) ||
				(typeof rawBody === "string" && rawBody.trim()) ||
				response.statusText ||
				"Unknown composer error";

			console.info(
				"[ComposerService.sendComposition] Composer response received",
				{
					httpStatus: response.status,
					httpStatusText: response.statusText,
					serviceSuccess: data.success,
					serviceStatus: data.statusCode,
					serviceMessage: data.message,
					payload: payloadLogSummary,
				},
			);

			if (!response.ok || data.success === false) {
				console.error(
					"[ComposerService.sendComposition] Composer send failed",
					{
						httpStatus: response.status,
						httpStatusText: response.statusText,
						payload: payloadLogSummary,
						parsedBody: data,
						rawBody,
					},
				);
				return {
					errorMessage: `Failed to send composition: ${responseMessage} - ${responseStatus}`,
					data: null,
					status: responseStatus,
					success: false,
				};
			}

			return {
				data: (data.responseObject ?? null) as null,
				status: responseStatus,
				success: true,
			};
		} catch (error: any) {
			console.error(
				"[ComposerService.sendComposition] Request threw an error",
				{
					error: error?.message || String(error),
					stack: error?.stack,
					payload: {
						composition_id: payload.composition_id,
						channels: payload.channels,
						type: payload.type,
					},
				},
			);
			return handleError(error);
		}
	}

	async createComposition(
		data: Partial<createComposition>,
		token: string,
	): Promise<StandardResponse<DocumentId>> {
		try {
			const base = envServices.API_GATEWAY;
			const url = new URL(API_ROUTES_COMPOSER.CREATE_COMPOSITION, base);

			const response = await fetch(url, {
				method: "POST",
				headers: authHeaders(token),
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
		token: string,
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

			const url = new URL(
				API_ROUTES_COMPOSER.SEND_TO_CHANNELS,
				envServices.API_GATEWAY,
			);
			const res = await fetch(url, {
				method: "POST",
				headers: authHeaders(token),
				body: JSON.stringify(payload),
			});

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
			const gatewayError = parseGatewayError(data, res.status);
			if (gatewayError) {
				return {
					data: null,
					status: gatewayError.status,
					success: false,
					errorMessage: gatewayError.message,
				};
			}

			return { data, status: res.status, success: true };
		} catch (error: any) {
			return handleError(error);
		}
	}

	async requestStructuredResponse(
		data: StructuredResponseModel,
		token: string,
	): Promise<StandardResponse<{ result: string }>> {
		try {
			const url = new URL(
				API_ROUTES_COMPOSER.COMPOSER_STRUCTURED_RESPONSE,
				envServices.API_GATEWAY,
			);
			const response = await fetch(url, {
				method: "POST",
				headers: authHeaders(token),
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
