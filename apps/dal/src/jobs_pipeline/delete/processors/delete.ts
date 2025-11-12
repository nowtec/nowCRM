import type { DocumentId } from "@nowcrm/services";
import { env } from "@/common/utils/env-config";
import { logger } from "@/server";

export const deleteEntityItems = async (
	entity: string,
	items: { documentId: DocumentId }[],
) => {
	let deletedCount = 0;
	let failedCount = 0;
	const failedItems: { id: DocumentId; error: string }[] = [];

	// Process items in batches of 1000
	const batchSize = 1000;
	const batches = [];

	for (let i = 0; i < items.length; i += batchSize) {
		batches.push(items.slice(i, i + batchSize));
	}

	logger.info(
		`Processing ${items.length} items in ${batches.length} batches of ${batchSize}`,
	);

	for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
		const batch = batches[batchIndex];
		const batchIds = batch.map((item) => item.documentId);

		try {
			logger.info(
				`Processing batch ${batchIndex + 1}/${batches.length} with ${batch.length} items`,
			);

			const response = await fetch(
				`${env.DAL_STRAPI_API_URL}/api/${entity}/bulk-delete`,
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${env.DAL_STRAPI_API_TOKEN}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						where: {
							documentId: {
								$in: batchIds,
							},
						},
					}),
				},
			);

			if (!response.ok) {
				const msg = `HTTP ${response.status} ${response.statusText}`;
				failedCount += batch.length;
				batch.forEach((item) => {
					failedItems.push({ id: item.documentId, error: msg });
				});
				logger.error(`Batch ${batchIndex + 1} failed: ${msg}`);
				continue;
			}

			const data = await response.json();

			if (data.success) {
				const batchDeletedCount = data.count || 0;
				deletedCount += batchDeletedCount;
				logger.info(
					`Batch ${batchIndex + 1} completed: deleted ${batchDeletedCount} items`,
				);
			} else {
				failedCount += batch.length;
				batch.forEach((item) => {
					failedItems.push({
						id: item.documentId,
						error: data.message || "Batch delete failed",
					});
				});
				logger.error(`Batch ${batchIndex + 1} failed: ${data.message}`);
			}
		} catch (error: any) {
			failedCount += batch.length;
			const message = error?.message || "Unknown error";
			batch.forEach((item) => {
				failedItems.push({ id: item.documentId, error: message });
			});
			logger.error(`Batch ${batchIndex + 1} failed: ${message}`);
		}
	}

	logger.info(
		`Deletion completed: ${deletedCount} deleted, ${failedCount} failed`,
	);

	return {
		deletedCount,
		failedCount,
		failedItems,
	};
};
