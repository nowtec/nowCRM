import type { DocumentId } from "@nowcrm/services";
import { env } from "@/common/utils/env-config";
import { pool } from "@/jobs_pipeline/csv-import/contacts/processors/helpers/db";
import { logger } from "@/server";

const RELATIONAL_FIELDS = new Set([
	"organization",
	"contact_interests",
	"department",
	"salutation",
	"title",
	"consent",
	"contact_extra_fields",
	"keywords",
	"tags",
	"ranks",
	"contact_types",
	"sources",
	"notes",
	"industry",
	"job_title",
]);

const MANY_TO_ONE_ENDPOINTS = new Set([
	"organizations",
	"job_titles",
	"contact-salutations",
	"contact-titles",
	"industries",
]);

interface UpdateItem {
	id: number;
	documentId: DocumentId;
	data?: Record<string, any> | null;
	relations?: Record<string, any> | null;
}

function toEndpoint(fieldKey: string): string {
	const specialMap: Record<string, string> = {
		salutation: "contact-salutations",
		title: "contact-titles",
	};
	if (specialMap[fieldKey]) return specialMap[fieldKey];
	const base = fieldKey.replace(/_/g, "-");
	return base.endsWith("s") ? base : `${base}s`;
}

async function resolveRelationIds(
	fieldKey: string,
	rawValue: any,
	headers: Record<string, string>,
	batchInfo: string,
	itemId: number,
): Promise<number[]> {
	const endpoint = toEndpoint(fieldKey);
	const values = Array.isArray(rawValue) ? rawValue : [rawValue];
	const ids: number[] = [];

	for (const val of values) {
		const name = String(val).trim();
		let foundId: number | null = null;

		try {
			const params = new URLSearchParams({
				"filters[name][$eq]": name,
			});
			const resp = await fetch(
				`${env.DAL_STRAPI_API_URL}/api/${endpoint}?${params}`,
				{ headers },
			);
			if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`);

			const data = await resp.json();
			const arr = data?.data;
			if (Array.isArray(arr) && arr.length > 0) {
				foundId = arr[0].id;
			}
		} catch (err: any) {
			logger.error(
				`${batchInfo} [Item ${itemId}] ${endpoint} lookup failed: ${err.message}`,
			);
			throw err;
		}

		if (foundId != null) {
			ids.push(foundId);
			continue;
		}

		try {
			const createResp = await fetch(
				`${env.DAL_STRAPI_API_URL}/api/${endpoint}`,
				{
					method: "POST",
					headers,
					body: JSON.stringify({ data: { name } }),
				},
			);
			if (!createResp.ok)
				throw new Error(`Create failed: HTTP ${createResp.status}`);

			const created = await createResp.json();
			const newId = created?.data?.id;
			if (!newId)
				throw new Error(`Empty id after creating ${endpoint}("${name}")`);
			ids.push(newId);
		} catch (err: any) {
			logger.error(
				`${batchInfo} [Item ${itemId}] ${endpoint} create failed: ${err.message}`,
			);
			throw err;
		}
	}

	return ids;
}

export const updateEntityItems = async (
	entity: string,
	items: UpdateItem[],
) => {
	let bulkUpdated = 0;
	let relationsLinked = 0;
	let failed = 0;
	const failedItems: { documentId: DocumentId; error: string }[] = [];

	const batchSize = 100;
	const batches: UpdateItem[][] = [];
	for (let i = 0; i < items.length; i += batchSize) {
		batches.push(items.slice(i, i + batchSize));
	}

	logger.info(
		`[START] entity="${entity}", total=${items.length}, batches=${batches.length}`,
	);

	for (let bi = 0; bi < batches.length; bi++) {
		const batch = batches[bi];
		const batchInfo = `[BATCH ${bi + 1}/${batches.length}]`;

		for (const it of batch) {
			if (it.data && typeof it.data === "object") {
				for (const [k, v] of Object.entries(it.data)) {
					if (RELATIONAL_FIELDS.has(k)) {
						it.relations = it.relations || {};
						it.relations[k] = v;
						delete it.data[k];
					}
				}
			}
		}

		const groups = new Map<
			string,
			{ ids: DocumentId[]; payload: Record<string, any> }
		>();
		for (const it of batch) {
			const payload: Record<string, any> = {};
			if (it.data && typeof it.data === "object") {
				for (const [k, v] of Object.entries(it.data)) {
					if (!RELATIONAL_FIELDS.has(k)) payload[k] = v;
				}
			}
			const key = JSON.stringify(payload);
			if (!groups.has(key)) groups.set(key, { ids: [], payload });
			groups.get(key)?.ids.push(it.documentId);
		}

		for (const { ids: grpIds, payload } of groups.values()) {
			if (Object.keys(payload).length === 0) continue;

			try {
				const resp = await fetch(
					`${env.DAL_STRAPI_API_URL}/api/${entity}/bulk-update`,
					{
						method: "POST",
						headers: {
							Authorization: `Bearer ${env.DAL_STRAPI_API_TOKEN}`,
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							where: { documentId: { $in: grpIds } },
							data: payload,
						}),
					},
				);
				if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`);

				const data = await resp.json();
				if (data.success) {
					bulkUpdated += data.count ?? grpIds.length;
				} else {
					throw new Error(data.message || "bulk-update failed");
				}
			} catch (err: any) {
				const msg = err?.message || "bulk-update error";
				failed += grpIds.length;
				grpIds.forEach((documentId) => {
					failedItems.push({ documentId, error: msg });
				});
				logger.error(`${batchInfo} bulk-update failed: ${msg}`);
			}
		}

		const linkMap: Record<string, Array<[number, number]>> = {};
		for (const it of batch) {
			if (!it.relations) continue;

			const headers = {
				Authorization: `Bearer ${env.DAL_STRAPI_API_TOKEN}`,
				"Content-Type": "application/json",
			};

			for (const [fieldKey, rawVal] of Object.entries(it.relations)) {
				try {
					const ids = await resolveRelationIds(
						fieldKey,
						rawVal,
						headers,
						batchInfo,
						it.id,
					);
					const endpoint = toEndpoint(fieldKey);
					if (!linkMap[endpoint]) {
						linkMap[endpoint] = [];
					}
					for (const rid of ids) {
						linkMap[endpoint].push([it.id, rid]);
					}
				} catch (err: any) {
					const msg = err.message || String(err);
					failed++;
					failedItems.push({
						documentId: it.documentId,
						error: `Field "${fieldKey}": ${msg}`,
					});
					logger.error(
						`${batchInfo} [Item ${it.id}] ${fieldKey} link failed: ${msg}`,
					);
				}
			}
		}

		const joinConfig: Record<string, { table: string; relCol: string }> = {
			organizations: {
				table: "contacts_organization_lnk",
				relCol: "organization_id",
			},
			"contact-interests": {
				table: "contacts_contact_interests_lnk",
				relCol: "contact_interest_id",
			},
			departments: {
				table: "contacts_department_lnk",
				relCol: "department_id",
			},
			keywords: { table: "contacts_keywords_lnk", relCol: "keyword_id" },
			"job-titles": {
				table: "contacts_job_title_lnk",
				relCol: "job_title_id",
			},
			tags: { table: "contacts_tags_lnk", relCol: "tag_id" },
			sources: { table: "contacts_sources_lnk", relCol: "source_id" },
			notes: { table: "contact_notes_contact_lnk", relCol: "contact_note_id" },
			ranks: { table: "contacts_ranks_lnk", relCol: "rank_id" },
			"contact-types": {
				table: "contacts_contact_types_lnk",
				relCol: "contact_type_id",
			},
			industries: { table: "contacts_industry_lnk", relCol: "industry_id" },
			"contact-salutations": {
				table: "contacts_salutation_lnk",
				relCol: "contact_salutation_id",
			},
			"contact-titles": {
				table: "contacts_title_lnk",
				relCol: "contact_title_id",
			},
			lists: { table: "contacts_lists_lnk", relCol: "list_id" },
		};

		const _DB_CHUNK_SIZE = 500;
		for (const [endpoint, pairs] of Object.entries(linkMap)) {
			const cfg = joinConfig[endpoint];
			if (!cfg) continue;

			if (MANY_TO_ONE_ENDPOINTS.has(endpoint)) {
				const uniqueContacts = [
					...new Set(pairs.map(([contactId]) => contactId)),
				];
				try {
					await pool.query(
						`DELETE FROM ${cfg.table} WHERE contact_id = ANY($1::int[])`,
						[uniqueContacts],
					);
				} catch (err: any) {
					logger.error(
						`${batchInfo} ${endpoint} cleanup failed: ${err.message}`,
					);
					continue;
				}
			}

			const DB_CHUNK_SIZE = 500;
			for (let i = 0; i < pairs.length; i += DB_CHUNK_SIZE) {
				const chunk = pairs.slice(i, i + DB_CHUNK_SIZE);
				const placeholders = chunk
					.map((_, idx) => `($${idx * 2 + 1},$${idx * 2 + 2})`)
					.join(",");
				const flat = chunk.flat();
				try {
					const res = await pool.query(
						`INSERT INTO ${cfg.table} (contact_id, ${cfg.relCol}) VALUES ${placeholders} ON CONFLICT DO NOTHING`,
						flat,
					);
					relationsLinked += res.rowCount ?? 0;
				} catch (err: any) {
					logger.error(
						`${batchInfo} ${endpoint} insert failed: ${err.message}`,
					);
				}
			}
		}
	}

	logger.info(
		`[COMPLETE] ${entity}: updated=${bulkUpdated}, linked=${relationsLinked}, failed=${failed}`,
	);
	return { bulkUpdated, relationsLinked, failed, failedItems };
};
