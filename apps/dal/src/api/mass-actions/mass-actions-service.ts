import { ServiceResponse } from "@nowcrm/services";
import { StatusCodes } from "http-status-codes";
import { csvMassActionsQueue } from "@/jobs_pipeline/common/mass-actions/csv-mass-actions-queue";
import type {
	MassAddToJourneyPayload,
	MassAddToListPayload,
	MassAddToOrganizationPayload,
	MassAnonymizePayload,
	MassDeletePayload,
	MassExportPayload,
	MassUpdatePayload,
	MassUpdateSubscriptionPayload,
} from "./mass-actions-model";

class MassActionsServiceApi {
	async deleteItems(payload: MassDeletePayload) {
		try {
			await csvMassActionsQueue.add("massDelete", payload);
			return ServiceResponse.success("Delete job queued", { count: 0 });
		} catch (error: any) {
			return ServiceResponse.failure(
				error.message,
				null,
				StatusCodes.INTERNAL_SERVER_ERROR,
			);
		}
	}

	async addToList(payload: MassAddToListPayload) {
		try {
			await csvMassActionsQueue.add("massAddToList", payload);
			return ServiceResponse.success("Add-to-list job queued", { count: 0 });
		} catch (error: any) {
			return ServiceResponse.failure(
				error.message,
				null,
				StatusCodes.INTERNAL_SERVER_ERROR,
			);
		}
	}

	async addToOrganization(payload: MassAddToOrganizationPayload) {
		try {
			await csvMassActionsQueue.add("massAddToOrganization", payload);
			return ServiceResponse.success("Add-to-organization job queued", {
				count: 0,
			});
		} catch (error: any) {
			return ServiceResponse.failure(
				error.message,
				null,
				StatusCodes.INTERNAL_SERVER_ERROR,
			);
		}
	}

	async addToJourney(payload: MassAddToJourneyPayload) {
		try {
			await csvMassActionsQueue.add("massAddToJourney", payload);
			return ServiceResponse.success("Add-to-journey job queued", { count: 0 });
		} catch (error: any) {
			return ServiceResponse.failure(
				error.message,
				null,
				StatusCodes.INTERNAL_SERVER_ERROR,
			);
		}
	}

	async export(payload: MassExportPayload) {
		try {
			await csvMassActionsQueue.add("massExport", payload);
			return ServiceResponse.success("Add-export job queued", { count: 0 });
		} catch (error: any) {
			return ServiceResponse.failure(
				error.message,
				null,
				StatusCodes.INTERNAL_SERVER_ERROR,
			);
		}
	}

	async update(payload: MassUpdatePayload) {
		try {
			console.log(`[massExport] requested by ${payload.userEmail ?? ""}`);
			await csvMassActionsQueue.add("massUpdate", payload);
			return ServiceResponse.success("Add-update job queued", { count: 0 });
		} catch (error: any) {
			return ServiceResponse.failure(
				error.message,
				null,
				StatusCodes.INTERNAL_SERVER_ERROR,
			);
		}
	}

	async updateSubscription(payload: MassUpdateSubscriptionPayload) {
		try {
			await csvMassActionsQueue.add("massUpdateSubscription", payload);
			return ServiceResponse.success("Add-update  subscription job queued", {
				count: 0,
			});
		} catch (error: any) {
			return ServiceResponse.failure(
				error.message,
				null,
				StatusCodes.INTERNAL_SERVER_ERROR,
			);
		}
	}

	async anonymize(payload: MassAnonymizePayload) {
		try {
			await csvMassActionsQueue.add("massAnonymize", payload);
			return ServiceResponse.success("Add-anonymize job queued", { count: 0 });
		} catch (error: any) {
			return ServiceResponse.failure(
				error.message,
				null,
				StatusCodes.INTERNAL_SERVER_ERROR,
			);
		}
	}
}

export const massActionsServiceApi = new MassActionsServiceApi();
