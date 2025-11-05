import axios from "axios";
import { env } from "@/common/utils/env-config";
import { logger } from "@/server";

export const deleteEntityItems = async (
	entity: string,
	items: { id: number }[],
) => {
	let deletedCount = 0;
	let failedCount = 0;
	const failedItems: { id: number; error: string }[] = [];

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
		const batchIds = batch.map((item) => item.id);

		try {
			logger.info(
				`Processing batch ${batchIndex + 1}/${batches.length} with ${batch.length} items`,
			);

			const response = await axios.post(
				`${env.DAL_STRAPI_API_URL}/api/${entity}/bulk-delete`,
				{
					where: {
						id: {
							$in: batchIds,
						},
					},
				},
				{
					headers: {
						Authorization: `Bearer ${env.DAL_STRAPI_API_TOKEN}`,
						"Content-Type": "application/json",
					},
				},
			);

			if (response.data.success) {
				const batchDeletedCount = response.data.count || 0;
				deletedCount += batchDeletedCount;
				logger.info(
					`Batch ${batchIndex + 1} completed: deleted ${batchDeletedCount} items`,
				);
			} else {
				// If the batch failed, mark all items in this batch as failed
				failedCount += batch.length;
				batch.forEach((item) => {
					failedItems.push({
						id: item.id,
						error: response.data.message || "Batch delete failed",
					});
				});
				logger.error(
					`Batch ${batchIndex + 1} failed: ${response.data.message}`,
				);
			}
		} catch (error: any) {
			// If the batch failed, mark all items in this batch as failed
			failedCount += batch.length;
			const message = error.response?.data?.error?.message || error.message;

			batch.forEach((item) => {
				failedItems.push({ id: item.id, error: message });
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
