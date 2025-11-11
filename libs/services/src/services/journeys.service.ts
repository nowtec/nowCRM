import {API_ROUTES_STRAPI} from "../api-routes/api-routes-strapi";
import { DocumentId } from "../client";
import { envServices } from "../envConfig";
import type { Form_Journey, Journey } from "../types/journey";
import BaseService from "./common/base.service";
import {
	handleError,
	handleResponse,
	type StandardResponse,
} from "./common/response.service";
import { journeyStepConnectionsService } from "./journey-step-connection.service";
import { journeyStepsService } from "./journey-steps.service";

class JourneysService extends BaseService<Journey, Form_Journey> {
	public constructor() {
		super(API_ROUTES_STRAPI.JOURNEYS);
	}

	async duplicate(
		journeyId: DocumentId,
		token: string,
	): Promise<StandardResponse<null>> {
		try {
			const url = `${envServices.STRAPI_URL}${API_ROUTES_STRAPI.JOURNEY_DUPLICATE}`;

			const response = await fetch(url, {
				method: "POST",
				headers: this.getHeaders(true, token),
				body: JSON.stringify({ id: journeyId }),
			});

			return await handleResponse(response);
		} catch (error: any) {
			return handleError(error);
		}
	}

	async fullDelete(journeyId: DocumentId, token: string): Promise<StandardResponse<null>> {
		try {
			const steps = await journeyStepsService.findAll(token, {
				filters: {
					journey: { documentId: { $eq: journeyId } },
				},
			});
			steps.data?.map(async (item) => {
				await journeyStepsService.delete(item.documentId, token);
			});
			const connections = await journeyStepConnectionsService.findAll(token, {
				filters: {
					target_step: {
						journey: { documentId: { $eq: journeyId } },
					},
				},
			});
			connections.data?.map(async (item) => {
				await journeyStepConnectionsService.delete(item.documentId, token);
			});
			await journeysService.delete(journeyId, token);

			return {
				data: null,
				status: 200,
				success: true,
			};
		} catch (error: any) {
			return handleError(error);
		}
	}
}

export const journeysService = new JourneysService();
