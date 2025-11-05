// file: anonymizeEntityItems.ts

import axios from "axios";
import { env } from "@/common/utils/env-config";
import { logger } from "@/server";

export const anonymizeEntityItems = async (
	entity: string,
	items: { id: number }[],
) => {
	logger.info(
		`[anonymizeEntityItems] START entity="${entity}", totalItems=${items.length}`,
	);

	let anonymizedCount = 0;
	let failedCount = 0;
	const failedItems: { id: number; error: string }[] = [];

	const url = `${env.STRAPI_URL}/api/contacts/anonymize-user`;

	for (const item of items) {
		try {
			logger.info(`[anonymizeEntityItems] Anonymizing contact id=${item.id}`);
			const response = await axios.post(
				url,
				{ contactId: item.id },
				{
					headers: {
						Authorization: `Bearer ${env.DAL_STRAPI_API_TOKEN}`,
						"Content-Type": "application/json",
					},
				},
			);

			if (response.data?.success) {
				anonymizedCount++;
				logger.info(`[anonymizeEntityItems] id=${item.id} → SUCCESS`);
			} else {
				const msg = response.data?.message ?? "Unknown failure";
				failedCount++;
				failedItems.push({ id: item.id, error: msg });
				logger.error(`[anonymizeEntityItems] id=${item.id} → FAILED: ${msg}`);
			}
		} catch (err: any) {
			const status = err.response?.status;
			const msg = err.response?.data?.message || err.message || "Unknown error";
			failedCount++;
			failedItems.push({ id: item.id, error: msg });
			logger.error(
				`[anonymizeEntityItems] id=${item.id} → EXCEPTION: status=${status}, msg=${msg}`,
				{ stack: err.stack, responseData: err.response?.data },
			);
		}
	}

	logger.info(
		`[anonymizeEntityItems] DONE entity="${entity}" — anonymized=${anonymizedCount}, failed=${failedCount}`,
	);
	if (failedItems.length) {
		logger.debug(
			`[anonymizeEntityItems] Failed items detail: ${JSON.stringify(failedItems)}`,
		);
	}

	return { anonymizedCount, failedCount, failedItems };
};
