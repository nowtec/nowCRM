import { Worker } from "bullmq";
import { env } from "@/common/utils/env-config";
import { logger } from "@/logger";
import { parseCSV } from "../common/helpers/parse-csv";
import { resolveDocumentId } from "../common/helpers/resolve-document-id";
import { contactsQueue } from "./contacts/contacts-queue";
import { createList } from "./contacts/processors/contacts/list";
import { loadRelationDictionaries } from "./contacts/processors/helpers/cache";
import { organizationsQueue } from "./orgs/organizations-queue";

const redisConnection = {
	host: env.DAL_REDIS_HOST,
	port: env.DAL_REDIS_PORT,
};

const processCsvJob = async (job: any) => {
	const {
		csv: csvContent,
		filename,
		type,
		mapping = {},
		selectedColumns = [],
		requiredColumns = [],
		extraColumns = [],
		subscribeAll = false,
		deduplicateByRequired = false,
		listMode = "new",
		listId: existingListId = null,
	} = job.data;

	logger.info(`Processing uploaded CSV "${filename}" (job ID: ${job.id})`);

	// Load relation dictionaries at the start
	await loadRelationDictionaries();

	const records = await parseCSV(csvContent, {
		mapping,
		requiredColumns,
		selectedColumns,
		extraColumns,
		subscribeAll,
		deduplicateByRequired,
	});

	logger.info(`Parsed ${records.length} ${type} from "${filename}"`);

	const batchSize = 1000;
	const totalBatches = Math.ceil(records.length / batchSize);

	let listId: number | undefined;
	if (type === "contacts") {
		if (listMode === "existing" && existingListId) {
			if (typeof existingListId === "number") {
				listId = existingListId;
			} else if (typeof existingListId === "string") {
				try {
					listId = await resolveDocumentId("lists", existingListId);
				} catch {
					logger.error("Error while processing list id");
				}
			}
		} else {
			try {
				const { list } = await createList({}, [], filename);
				listId = list.id;
				logger.info(
					`Created empty contact list "${list.name}" (id: ${listId})`,
				);
			} catch (err: any) {
				logger.error(`Failed to create empty contact list: ${err.message}`);
			}
		}
	}

	for (let i = 0; i < records.length; i += batchSize) {
		const batch = records.slice(i, i + batchSize);
		const destinationQueue =
			type === "organizations" ? organizationsQueue : contactsQueue;

		await destinationQueue.add(
			"processBatch",
			{
				[type]: batch,
				filename,
				parentJobId: job.id,
				type,
				listId,
				subscribeAll,
				requiredColumns,
			},
			{
				delay: 200,
			},
		);

		logger.info(
			`Batch ${i / batchSize + 1}/${totalBatches} sent to ${type}Queue`,
		);
	}

	logger.info(`File processing complete for "${filename}" (job ${job.id})`);
};

export const csvContactsProcessingWorker = new Worker(
	"csvContactsQueue",
	processCsvJob,
	{
		connection: redisConnection,
	},
);

export const csvOrganizationsProcessingWorker = new Worker(
	"csvOrganizationsQueue",
	processCsvJob,
	{
		connection: redisConnection,
	},
);

csvContactsProcessingWorker.on("failed", (job, err) => {
	logger.error(`CSV Contacts job ${job?.id} failed: ${err.message}`);
});

csvOrganizationsProcessingWorker.on("failed", (job, err) => {
	logger.error(`CSV Organizations job ${job?.id} failed: ${err.message}`);
});
