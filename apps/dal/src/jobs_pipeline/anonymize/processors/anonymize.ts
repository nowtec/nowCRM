// file: anonymizeEntityItems.ts

import type { DocumentId } from "@nowcrm/services";
import { env } from "@/common/utils/env-config";
import { logger } from "@/server";

export const anonymizeEntityItems = async (
	entity: string,
	items: { documentId: DocumentId }[],
) => {
	logger.info(
		`[anonymizeEntityItems] START entity="${entity}", totalItems=${items.length}`,
	);

	let anonymizedCount = 0;
	let failedCount = 0;
	const failedItems: { id: DocumentId; error: string }[] = [];

	const url = `${env.STRAPI_URL}contacts/anonymize-user`;

	for (const item of items) {
		try {
			logger.info(
				`[anonymizeEntityItems] Anonymizing contact id=${item.documentId}`,
			);

			const response = await fetch(url, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${env.DAL_STRAPI_API_TOKEN}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ contactId: item.documentId }),
			});

			if (!response.ok) {
				const msg = `HTTP ${response.status} ${response.statusText}`;
				failedCount++;
				failedItems.push({ id: item.documentId, error: msg });
				logger.error(
					`[anonymizeEntityItems] id=${item.documentId} → FAILED: ${msg}`,
				);
				continue;
			}

			const data = await response.json();

			if (data?.success) {
				anonymizedCount++;
				logger.info(`[anonymizeEntityItems] id=${item.documentId} → SUCCESS`);
			} else {
				const msg = data?.message ?? "Unknown failure";
				failedCount++;
				failedItems.push({ id: item.documentId, error: msg });
				logger.error(
					`[anonymizeEntityItems] id=${item.documentId} → FAILED: ${msg}`,
				);
			}
		} catch (err: any) {
			const msg = err?.message || "Unknown error";
			failedCount++;
			failedItems.push({ id: item.documentId, error: msg });
			logger.error(
				`[anonymizeEntityItems] id=${item.documentId} → EXCEPTION: msg=${msg}, stack=${err.stack || "no stack"}`,
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
