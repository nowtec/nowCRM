import { API_ROUTES_DAL } from "../../api-routes/api-routes-dal";
import { envServices } from "../../env-config";
import type { DocumentId } from "../../types/common/base-type";
import type { ImportRecord } from "../../types/dal/import-record";
import type { ServiceResponse } from "../../types/microservices/service-response";
import { handleError, type StandardResponse } from "../common/response.service";

class DalService {
	async fetchPreviousImports(
		page = 1,
		jobsPerPage = 20,
		type: "contacts" | "organizations" | "mass-actions" = "contacts",
	): Promise<StandardResponse<ImportRecord[]>> {
		try {
			const url = new URL(
				`api/${API_ROUTES_DAL.QUEUE_DATA}`,
				envServices.API_GATEWAY,
			);
			url.searchParams.set("page", page.toString());
			url.searchParams.set("jobsPerPage", jobsPerPage.toString());
			url.searchParams.set("type", type);

			const response = await fetch(url, {
				cache: "no-store",
			});

			if (!response.ok) {
				const errorText = await response.text();
				console.error(" Response not OK:", errorText);
				throw new Error("Failed to load data");
			}

			const data = (await response.json()) as ServiceResponse<{
				jobs: ImportRecord[];
			}>;
			const jobsRaw = data.responseObject?.jobs;

			if (!Array.isArray(jobsRaw)) {
				return {
					data: null,
					status: 500,
					success: false,
					errorMessage: "Invalid jobs format",
				};
			}

			const jobs: ImportRecord[] = jobsRaw.map((job: any) => ({
				id: job.id,
				filename: job.filename,
				createdAt: job.createdAt,
				status: job.status ?? "",
				type: job.type,
				progressPercent: job.progressPercent ?? 0,
				jobId: job.jobId ?? job.id,
				failedContacts: Array.isArray(job.failedContacts)
					? job.failedContacts
					: [],
				failedOrgs: Array.isArray(job.failedOrgs) ? job.failedOrgs : [],
				massAction: job.massAction ?? null,
				listName: job.listName ?? null,
				typeField: job.typeField ?? null,
				parsedSearchMask: job.parsedSearchMask ?? "",
			}));

			return {
				data: jobs,
				status: 200,
				success: true,
			};
		} catch (error: any) {
			return handleError(error);
		}
	}

	async uploadCSV(formData: FormData): Promise<any> {
		const file = formData.get("file") as File;
		const filename = formData.get("filename") as string;
		const type = formData.get("type") as string;
		const mapping = JSON.parse(formData.get("mapping") as string);
		const requiredColumns = JSON.parse(
			formData.get("requiredColumns") as string,
		);
		const selectedColumns = JSON.parse(
			formData.get("selectedColumns") as string,
		);
		const extraColumns = JSON.parse(formData.get("extraColumns") as string);
		const subscribeAll = formData.get("subscribeAll") as string;
		const deduplicateByRequired = formData.get(
			"deduplicateByRequired",
		) as string;
		const listMode = formData.get("listMode") as string;
		const listId = formData.get("listId") as string;

		const upstreamFormData = new FormData();
		upstreamFormData.append("file", file);
		upstreamFormData.append("filename", filename);
		upstreamFormData.append("type", type);
		upstreamFormData.append("mapping", JSON.stringify(mapping));
		upstreamFormData.append("requiredColumns", JSON.stringify(requiredColumns));
		upstreamFormData.append("selectedColumns", JSON.stringify(selectedColumns));
		upstreamFormData.append("extraColumns", JSON.stringify(extraColumns));
		upstreamFormData.append("subscribeAll", subscribeAll);
		upstreamFormData.append("deduplicateByRequired", deduplicateByRequired);
		upstreamFormData.append("listMode", listMode);
		upstreamFormData.append("listId", listId);

		try {
			const url = new URL(API_ROUTES_DAL.UPLOAD, envServices.DAL_URL);
			const res = await fetch(url, {
				method: "POST",
				body: upstreamFormData,
				cache: "no-store",
			});

			if (!res.ok) {
				console.error(await res.text());
				throw new Error("DAL API failed");
			}

			return await res.json();
		} catch (error: any) {
			return handleError(error);
		}
	}

	async deleteContactsByFilters(payload: {
		entity: string;
		searchMask: any;
		mass_action: string;
	}): Promise<StandardResponse<any>> {
		try {
			const transformedFilters = payload.searchMask;

			const updatedPayload = {
				...payload,
				searchMask: transformedFilters,
			};

			console.log("[API] Deleting contacts with payload:", updatedPayload);

			const url = new URL(API_ROUTES_DAL.MASS_DELETE, envServices.DAL_URL);
			const res = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(updatedPayload),
			});

			if (!res.ok) {
				const errorText = await res.text();
				console.error("Delete failed:", errorText);
				throw new Error("Failed to delete contacts");
			}

			return {
				data: await res.json(),
				status: res.status,
				success: true,
			};
		} catch (error: any) {
			return handleError(error);
		}
	}

	async exportContactsByFilters(
		payload: {
			entity: string;
			searchMask: any;
			mass_action: string;
		},
		userEmail: string,
	): Promise<StandardResponse<any>> {
		try {
			const transformedFilters = payload.searchMask;

			const updatedPayload = {
				...payload,
				searchMask: transformedFilters,
				userEmail,
			};
			console.log(`[Export] Requested by user: ${userEmail}`);
			console.log("[API] Export contacts with payload:", updatedPayload);

			const url = new URL(API_ROUTES_DAL.MASS_EXPORT, envServices.DAL_URL);
			const res = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(updatedPayload),
			});

			if (!res.ok) {
				const errorText = await res.text();
				console.error("Export failed:", errorText);
				throw new Error("Failed to export contacts");
			}

			return {
				data: await res.json(),
				status: res.status,
				success: true,
			};
		} catch (error: any) {
			return handleError(error);
		}
	}

	async addContactsToListByFilters(
		filters: Record<string, any>,
		listId: DocumentId,
	): Promise<StandardResponse<any>> {
		try {
			const payload = {
				entity: "contacts",
				searchMask: filters,
				mass_action: "add_to_list",
				list_id: listId,
			};

			console.log(">>> ADD TO LIST PAYLOAD:", JSON.stringify(payload, null, 2));

			const url = new URL(API_ROUTES_DAL.MASS_ADD_TO_LIST, envServices.DAL_URL);
			const res = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(payload),
			});

			if (!res.ok) {
				const errorText = await res.text();
				console.error("Add to list failed:", errorText);
				throw new Error("Failed to add contacts to list");
			}

			return {
				data: await res.json(),
				status: res.status,
				success: true,
			};
		} catch (error: any) {
			return handleError(error);
		}
	}

	async fetchProgressMap(): Promise<StandardResponse<Map<string, number>>> {
		try {
			const url = new URL(API_ROUTES_DAL.PROGRESS, envServices.DAL_URL);
			const response = await fetch(url, {
				cache: "no-store",
			});

			if (!response.ok) {
				throw new Error("Failed to fetch progress map");
			}

			const data = (await response.json()) as any;
			const progressMap = new Map<string, number>(
				data.progress.map((item: any) => [
					item.jobId,
					Number(item.progressPercent),
				]),
			);

			return {
				data: progressMap,
				status: 200,
				success: true,
			};
		} catch (error: any) {
			return handleError(error);
		}
	}

	async updateContactsByFilters(
		filters: Record<string, any>,
		updateData: Record<string, any>,
	): Promise<StandardResponse<any>> {
		try {
			const payload = {
				entity: "contacts",
				searchMask: filters,
				mass_action: "update",
				update_data: updateData,
			};

			console.log(
				"[API] Updating contacts with payload:",
				JSON.stringify(payload, null, 2),
			);

			const url = new URL(API_ROUTES_DAL.MASS_UPDATE, envServices.DAL_URL);
			const res = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(payload),
			});

			if (!res.ok) {
				const errorText = await res.text();
				console.error("Update contacts failed:", errorText);
				throw new Error("Failed to update contacts");
			}

			return {
				data: await res.json(),
				status: res.status,
				success: true,
			};
		} catch (error: any) {
			return handleError(error);
		}
	}

	async addContactsToJourneyByFilters(
		filters: Record<string, any>,
		JourneyId: DocumentId,
	): Promise<StandardResponse<any>> {
		try {
			const payload = {
				entity: "contacts",
				searchMask: filters,
				mass_action: "add_to_journey",
				journey_id: JourneyId,
			};

			console.log(
				">>> ADD TO Journey PAYLOAD:",
				JSON.stringify(payload, null, 2),
			);

			const url = new URL(
				API_ROUTES_DAL.MASS_ADD_TO_JOURNEY,
				envServices.DAL_URL,
			);
			const res = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(payload),
			});

			if (!res.ok) {
				const errorText = await res.text();
				console.error("Add to Journey failed:", errorText);
				throw new Error("Failed to add contacts to Journey");
			}

			return {
				data: await res.json(),
				status: res.status,
				success: true,
			};
		} catch (error: any) {
			return handleError(error);
		}
	}

	async updateSubscriptionContactsByFilters(
		filters: Record<string, any>,
		channelId: DocumentId,
		isSubscribe: boolean,
		addEvent?: boolean,
	): Promise<StandardResponse<any>> {
		try {
			const payload = {
				entity: "contacts",
				searchMask: filters,
				mass_action: "update_subscription",
				channelId,
				isSubscribe,
				addEvent: !!addEvent,
			};

			console.log(
				">>> Update Subscription PAYLOAD:",
				JSON.stringify(payload, null, 2),
			);

			const url = new URL(
				API_ROUTES_DAL.MASS_UPDATE_SUBSCRIPTION,
				envServices.DAL_URL,
			);
			const res = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(payload),
			});

			if (!res.ok) {
				const errorText = await res.text();
				console.error("Updating subscription failed:", errorText);
				throw new Error("Failed to update subscription to contacts");
			}

			return {
				data: await res.json(),
				status: res.status,
				success: true,
			};
		} catch (error: any) {
			return handleError(error);
		}
	}

	async addContactsToOrganizationByFilters(
		filters: Record<string, any>,
		organizationId: DocumentId,
	): Promise<StandardResponse<any>> {
		try {
			const payload = {
				entity: "contacts",
				searchMask: filters,
				mass_action: "add_to_organization",
				organization_id: organizationId,
			};

			console.log(">>> ADD TO Orgs PAYLOAD:", JSON.stringify(payload, null, 2));

			const url = new URL(
				API_ROUTES_DAL.MASS_ADD_TO_ORGANIZATION,
				envServices.DAL_URL,
			);
			const res = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(payload),
			});

			if (!res.ok) {
				const errorText = await res.text();
				console.error("Add to list failed:", errorText);
				throw new Error("Failed to add contacts to organization");
			}

			return {
				data: await res.json(),
				status: res.status,
				success: true,
			};
		} catch (error: any) {
			return handleError(error);
		}
	}

	async anonymizeContactsByFilters(payload: {
		entity: string;
		searchMask: any;
		mass_action: string;
	}): Promise<StandardResponse<any>> {
		try {
			const transformedFilters = payload.searchMask;

			const updatedPayload = {
				...payload,
				searchMask: transformedFilters,
			};

			console.log("[API] Anonymized contacts with payload:", updatedPayload);

			const url = new URL(API_ROUTES_DAL.MASS_ANONYMIZE, envServices.DAL_URL);
			const res = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(updatedPayload),
			});

			if (!res.ok) {
				const errorText = await res.text();
				console.error("Delete anonymized:", errorText);
				throw new Error("Anonymized to delete contacts");
			}

			return {
				data: await res.json(),
				status: res.status,
				success: true,
			};
		} catch (error: any) {
			return handleError(error);
		}
	}
}

export const dalService = new DalService();
