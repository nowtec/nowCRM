import axios from "axios";
import { env } from "@/common/utils/env-config";
import { pool } from "@/lib/functions/helpers/db";
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
			const resp = await axios.get(
				`${env.DAL_STRAPI_API_URL}/api/${endpoint}`,
				{
					params: { filters: { name: { $eq: name } } },
					headers,
				},
			);

			const arr = resp.data?.data;
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

		// create new relation
		try {
			const createResp = await axios.post(
				`${env.DAL_STRAPI_API_URL}/api/${endpoint}`,
				{ data: { name } },
				{ headers },
			);
			const newId = createResp.data?.data?.id;
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
	const failedItems: { id: number; error: string }[] = [];

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
			{ ids: number[]; payload: Record<string, any> }
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
			groups.get(key)!.ids.push(it.id);
		}

		for (const { ids: grpIds, payload } of groups.values()) {
			if (Object.keys(payload).length === 0) continue;

			try {
				const resp = await axios.post(
					`${env.DAL_STRAPI_API_URL}/api/${entity}/bulk-update`,
					{ where: { id: { $in: grpIds } }, data: payload },
					{
						headers: {
							Authorization: `Bearer ${env.DAL_STRAPI_API_TOKEN}`,
							"Content-Type": "application/json",
						},
					},
				);
				if (resp.data.success) {
					bulkUpdated += resp.data.count ?? grpIds.length;
				} else {
					throw new Error(resp.data.message || "bulk-update failed");
				}
			} catch (err: any) {
				const msg = err.response?.data?.error?.message || err.message;
				failed += grpIds.length;
				grpIds.forEach((id) => failedItems.push({ id, error: msg }));
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
					for (const rid of ids) (linkMap[endpoint] ||= []).push([it.id, rid]);
				} catch (err: any) {
					const msg = err.message || String(err);
					failed++;
					failedItems.push({ id: it.id, error: `Field "${fieldKey}": ${msg}` });
					logger.error(
						`${batchInfo} [Item ${it.id}] ${fieldKey} link failed: ${msg}`,
					);
				}
			}
		}

		const joinConfig: Record<string, { table: string; relCol: string }> = {
			organizations: {
				table: "contacts_organization_links",
				relCol: "organization_id",
			},
			"contact-interests": {
				table: "contacts_contact_interests_links",
				relCol: "contact_interest_id",
			},
			departments: {
				table: "contacts_department_links",
				relCol: "department_id",
			},
			keywords: { table: "keywords_contacts_links", relCol: "keyword_id" },
			"job-titles": {
				table: "contacts_job_title_links",
				relCol: "job_title_id",
			},
			tags: { table: "contacts_tags_links", relCol: "tag_id" },
			sources: { table: "sources_contacts_links", relCol: "source_id" },
			notes: { table: "notes_contact_links", relCol: "note_id" },
			ranks: { table: "ranks_contacts_links", relCol: "rank_id" },
			"contact-types": {
				table: "contacts_contact_types_links",
				relCol: "contact_type_id",
			},
			industries: { table: "contacts_industry_links", relCol: "industry_id" },
			"contact-salutations": {
				table: "contacts_salutation_links",
				relCol: "contact_salutation_id",
			},
			"contact-titles": {
				table: "contacts_title_links",
				relCol: "contact_title_id",
			},
			lists: { table: "contacts_lists_links", relCol: "list_id" },
		};

		const DB_CHUNK_SIZE = 500;
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
