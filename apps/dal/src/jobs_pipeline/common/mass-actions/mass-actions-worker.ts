import type { DocumentId } from "@nowcrm/services";
import { Worker as BullWorker } from "bullmq";
import { pino } from "pino";
import qs from "qs";
import { env } from "@/common/utils/env-config";
import { addToJourneyQueue } from "@/jobs_pipeline/add-to-journey/add-to-journey-queue";
import { addToListQueue } from "@/jobs_pipeline/add-to-list/add-to-list-queue";
import { addToOrganizationQueue } from "@/jobs_pipeline/add-to-organization/add-to-organization-queue";
import { anonymizeQueue } from "@/jobs_pipeline/anonymize/anonymize-queue";
import { deletionQueue } from "@/jobs_pipeline/delete/deletion-queue";
import { exportQueue } from "@/jobs_pipeline/export/export-queue";
import { updateQueue } from "../../update/update-queue";
import { updateSubscriptionQueue } from "../../update-subscription/update-subscription";

type MassActionType =
	| "delete"
	| "add_to_list"
	| "add_to_organization"
	| "add_to_journey"
	| "anonymize"
	| "export"
	| "update_subscription"
	| "update";

type JobData = {
	entity: string;
	searchMask: Record<string, any>;
	mass_action: MassActionType;
	list_id?: number;
	channelId?: number;
	isSubscribe?: boolean;
	organization_id?: number;
	journey_id?: number;
	userEmail?: string;
	addEvent?: boolean;
	update_data?: {
		field: string;
		value: any;
		label?: string;
	};
};

type StrapiItem = {
	id?: number;
	documentId: DocumentId;
};

//check if it returns id and document_id
export const fetchPage = async (
	entity: string,
	searchMask: Record<string, any>,
	page: number,
	pageSize: number,
	logger: any,
): Promise<any[]> => {
	const query = qs.stringify(
		{
			filters: searchMask,
			pagination: { pageSize, page },
			populate: "*",
			publicationState: "live", //check
		},
		{ encodeValuesOnly: true },
	);

	const url = `${env.STRAPI_URL}${entity}?${query}`;
	try {
		const response = await fetch(url, {
			method: "GET",
			headers: {
				Authorization: `Bearer ${env.DAL_STRAPI_API_TOKEN}`,
			},
		});

		if (!response.ok) {
			const text = await response.text();
			throw new Error(
				`HTTP ${response.status} ${response.statusText}: ${text}`,
			);
		}

		const json = await response.json();
		return json.data || [];
	} catch (error: any) {
		logger.error(
			`[${entity}] fetchPage error (page ${page}): ${error.message}`,
		);
		throw error;
	}
};

const massActionHandlers: Record<
	MassActionType,
	(params: {
		entity: string;
		items: StrapiItem[];
		jobData: JobData;
	}) => Promise<void>
> = {
	delete: async ({ entity, items }) => {
		await deletionQueue.add("deleteBatch", { entity, items });
	},

	add_to_list: async ({ entity, items, jobData }) => {
		if (!jobData.list_id) {
			throw new Error("Missing list_id for add_to_list");
		}
		console.log(
			`[add_to_list] Enqueuing ${items.length} items to list ${jobData.list_id}`,
		);
		await addToListQueue.add("addToListBatch", {
			entity,
			items,
			listField: "lists",
			listId: jobData.list_id,
		});
	},

	update: async ({ entity, items, jobData }) => {
		if (!jobData.update_data) {
			throw new Error("Missing update_data for update action");
		}

		const { field, value } = jobData.update_data;

		const enrichedItems = items.map((item) => ({
			id: item.id,
			documentId: item.documentId,
			data: { [field]: value },
		}));

		console.log(
			`[update handler] entity=${entity}, update field=${field}, value=${JSON.stringify(value)}, items=${enrichedItems
				.map((i) => i.documentId)
				.join(", ")}`,
		);

		await updateQueue.add("updateBatch", {
			entity,
			items: enrichedItems,
			updateField: field,
			updateValue: value,
			userEmail: jobData.userEmail,
		});
	},

	update_subscription: async ({ items, jobData }) => {
		const { channelId, isSubscribe, addEvent } = jobData;

		if (channelId === undefined || channelId === null) {
			throw new Error("Missing channelId for update_subscription");
		}
		if (typeof isSubscribe !== "boolean") {
			throw new Error(
				"Missing or invalid isSubscribe flag for update_subscription",
			);
		}

		const contactIds = items.map((it) => it.id);

		console.log(
			`[update_subscription] Enqueuing ${contactIds.length} contacts for channel ${channelId}, isSubscribe=${isSubscribe}, addEvent=${addEvent}`,
		);

		await updateSubscriptionQueue.add("updateSubscriptionBatch", {
			items: contactIds,
			channelId,
			isSubscribe,
			addEvent: !!addEvent,
		});
	},

	anonymize: async ({ entity, items }) => {
		await anonymizeQueue.add("anonymizeBatch", { entity, items });
	},

	export: async ({ entity, jobData }) => {
		await exportQueue.add("exportBatch", {
			entity,
			userEmail: jobData.userEmail,
		});
	},

	add_to_organization: async ({ entity, items, jobData }) => {
		if (!jobData.organization_id) {
			throw new Error("Missing organization_id for add_to_organization");
		}
		await addToOrganizationQueue.add("addToOrganizationBatch", {
			entity,
			items,
			listField: "organizations",
			organizationId: jobData.organization_id,
		});
	},

	add_to_journey: async ({ entity, items, jobData }) => {
		if (!jobData.list_id) {
			throw new Error("Missing journey_id for add_to_journey");
		}
		await addToJourneyQueue.add("addToJourneyBatch", {
			entity,
			items,
			listField: "journeys",
			journeyStepId: jobData.list_id,
		});
	},
};

export const startMassActionsWorker = () => {
	for (let i = 0; i < env.DAL_WORKER_COUNT; i++) {
		const workerId = `MassActionsWorker-${i + 1}`;
		const logger = pino({
			name: "massActionsWorker",
			transport: { target: "pino-pretty" },
		});

		const worker = new BullWorker<JobData>(
			"csvMassActionsQueue",
			async (job) => {
				const { entity, searchMask, mass_action } = job.data;
				logger.info(
					`[${workerId}] RECEIVED job ${job.id}: action=${mass_action}, entity=${entity}`,
				);

				const handler = massActionHandlers[mass_action];
				if (!handler) {
					logger.warn(
						`[${workerId}] Unsupported action "${mass_action}". Skipping job ${job.id}`,
					);
					return;
				}

				logger.info(`[${workerId}] JOB ${job.id} started`);
				let totalProcessed = 0;

				if (mass_action === "delete") {
					while (true) {
						const collected: StrapiItem[] = [];
						for (let page = 1; page <= 10; page++) {
							const pageItems = await fetchPage(
								entity,
								searchMask,
								page,
								100,
								logger,
							);
							if (pageItems.length === 0) break;
							collected.push(...pageItems);
						}
						if (collected.length === 0) break;
						await handler({ entity, items: collected, jobData: job.data });
						totalProcessed += collected.length;
						await new Promise((res) => setTimeout(res, 100));
					}
				} else if (mass_action === "export") {
					await handler({ entity, items: [], jobData: job.data });
					logger.info(`[${workerId}] JOB ${job.id} queued for export`);
				} else {
					let page = 1;
					while (true) {
						const pageItems = await fetchPage(
							entity,
							searchMask,
							page,
							100,
							logger,
						);
						if (pageItems.length === 0) break;
						await handler({ entity, items: pageItems, jobData: job.data });
						totalProcessed += pageItems.length;
						page++;
						await new Promise((res) => setTimeout(res, 100));
					}
				}

				logger.info(
					`[${workerId}] JOB ${job.id} completed: all processed ${totalProcessed} items`,
				);
			},
			{
				connection: {
					host: env.DAL_REDIS_HOST,
					port: env.DAL_REDIS_PORT,
				},
				concurrency: env.DAL_JOB_CONCURRENCY,
			},
		);

		worker.on("completed", (job) => {
			logger.info(`[${workerId}] COMPLETED job ${job.id}`);
		});

		worker.on("failed", (job, err) => {
			logger.error(`[${workerId}] FAILED job ${job?.id}: ${err.message}`);
		});

		logger.info(`[${workerId}] STARTED`);
	}
};
