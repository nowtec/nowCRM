import API_ROUTES_STRAPI from "../api-routes/api-routes-strapi";
import type { DocumentId } from "../types/common/base_type";
import type { Form_JourneyStep, JourneyStep } from "../types/journey-step";
import { actionsService } from "./action.service";
import BaseService from "./common/base.service";
import { handleError, type StandardResponse } from "./common/response.service";
import { journeyPassedStepService } from "./journey-passed-step.service";

class JourneyStepsService extends BaseService<JourneyStep, Form_JourneyStep> {
	public constructor() {
		super(API_ROUTES_STRAPI.JOURNEY_STEPS);
	}

	async checkPassedStep(
		token: string,
		stepId: number,
		contactId: number,
		compositionId: number,
	): Promise<StandardResponse<boolean>> {
		try {
			const data = await journeyPassedStepService.find(token, {
				filters: {
					journey_step: { id: { $eq: stepId } },
					composition: { id: { $eq: compositionId } },
					contact: { id: { $eq: contactId } },
				},
			});

			if (!data.data)
				return {
					data: null,
					status: data.status,
					success: false,
					errorMessage: "Could not check passed step .Probably strapi is down",
				};

			return {
				data: data.data.length > 0,
				status: data.status,
				success: data.success,
			};
		} catch (error: any) {
			return handleError(error);
		}
	}
	async checkStepAction(
		token: string,
		stepId: DocumentId,
		contactId: DocumentId,
	): Promise<
		StandardResponse<{ find: boolean; target_step: DocumentId | null }>
	> {
		try {
			const data = await actionsService.find(token, {
				filters: {
					action_type: { $eq: "step_reached" },
					external_id: { $eq: stepId.toString() },
					contact: { documentId: { $eq: contactId } },
				} as any, //TODO: update action type on shared folder + journey-finished to const,
			});

			if (!data.data)
				return handleError(
					new Error("Could not check step action. Probably strapi is down"),
				);

			let targetStep: DocumentId;
			try {
				const payloadRaw = data?.data?.[0]?.payload;

				// Try to parse payload if it's a string
				const payloadObj =
					typeof payloadRaw === "string" ? JSON.parse(payloadRaw) : payloadRaw;

				targetStep = payloadObj?.target_step;
			} catch (e) {
				return handleError(
					new Error(`Could not parse payload or extract target_step: ${e}`),
				);
			}

			return {
				data: {
					find: data.data.length > 0,
					target_step: targetStep,
				},
				status: data.status,
				success: true,
			};
		} catch (error: any) {
			return handleError(error);
		}
	}
}

export const journeyStepsService = new JourneyStepsService();
