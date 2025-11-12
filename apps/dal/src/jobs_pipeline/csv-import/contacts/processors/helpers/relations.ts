import type { Job } from "bullmq";
import { logger } from "@/logger";
import { relationCache } from "./cache";
import { pool } from "./db";

export const contactsJoinConfig: Record<
	string,
	{ table: string; leftCol: string; relCol: string }
> = {
	organizations: {
		table: "contacts_organization_lnk",
		leftCol: "contact_id",
		relCol: "organization_id",
	},
	"contact-interests": {
		table: "contacts_contact_interests_lnk",
		leftCol: "contact_id",
		relCol: "contact_interest_id",
	},
	departments: {
		table: "contacts_department_lnk",
		leftCol: "contact_id",
		relCol: "department_id",
	},
	keywords: {
		table: "keywords_contacts_lnk",
		leftCol: "contact_id",
		relCol: "keyword_id",
	},
	job_titles: {
		table: "contacts_job_title_lnk",
		leftCol: "contact_id",
		relCol: "job_title_id",
	},
	tags: {
		table: "contacts_tags_lnk",
		leftCol: "contact_id",
		relCol: "tag_id",
	},
	sources: {
		table: "sources_contacts_lnk",
		leftCol: "contact_id",
		relCol: "source_id",
	},
	contact_notes: {
		table: "notes_contact_lnk",
		leftCol: "contact_id",
		relCol: "note_id",
	},
	contact_ranks: {
		table: "ranks_contacts_lnk",
		leftCol: "contact_id",
		relCol: "rank_id",
	},
	"contact-types": {
		table: "contacts_contact_types_lnk",
		leftCol: "contact_id",
		relCol: "contact_type_id",
	},
	industries: {
		table: "contacts_industry_lnk",
		leftCol: "contact_id",
		relCol: "industry_id",
	},
	"contact-titles": {
		table: "contacts_title_lnk",
		leftCol: "contact_id",
		relCol: "contact_title_id",
	},
	"contact-salutations": {
		table: "contacts_salutation_lnk",
		leftCol: "contact_id",
		relCol: "contact_salutation_id",
	},
	lists: {
		table: "contacts_lists_lnk",
		leftCol: "contact_id",
		relCol: "list_id",
	},
};

export const orgsJoinConfig: Record<
	string,
	{ table: string; leftCol: string; relCol: string }
> = {
	contacts: {
		table: "contacts_organization_lnk",
		leftCol: "organization_id",
		relCol: "contact_id",
	},
	keywords: {
		table: "keywords_organizations_lnk",
		leftCol: "organization_id",
		relCol: "keyword_id",
	},
	industries: {
		table: "organizations_industry_lnk",
		leftCol: "organization_id",
		relCol: "industry_id",
	},
	sources: {
		table: "sources_organizations_lnk",
		leftCol: "organization_id",
		relCol: "source_id",
	},
	contact_notes: {
		table: "notes_organization_lnk",
		leftCol: "organization_id",
		relCol: "note_id",
	},
	ranks: {
		table: "ranks_organizations_lnk",
		leftCol: "organization_id",
		relCol: "rank_id",
	},
	lists: {
		table: "organizations_lists_lnk",
		leftCol: "organization_id",
		relCol: "list_id",
	},
	"organization-types": {
		table: "organizations_organization_type_lnk",
		leftCol: "organization_id",
		relCol: "organization_type_id",
	},
	"media-types": {
		table: "organizations_media_type_lnk",
		leftCol: "organization_id",
		relCol: "media_type_id",
	},
	frequencies: {
		table: "organizations_frequency_lnk",
		leftCol: "organization_id",
		relCol: "frequency_id",
	},
	departments: {
		table: "organizations_department_lnk",
		leftCol: "organization_id",
		relCol: "department_id",
	},
};

export const relationFields = {
	organization: "organizations",
	contact_interests: "contact-interests",
	department: "departments",
	consent: "consents",
	// contact_extra_fields: "contact-extra-fields",
	keywords: "keywords",
	job_title: "job_titles",
	tags: "tags",
	contact_ranks: "contact_ranks",
	contact_types: "contact-types",
	sources: "sources",
	contact_notes: "contact_notes",
	industry: "industries",
	title: "contact-titles",
	salutation: "contact-salutations",
	frequency: "frequencies",
	media_type: "media-types",
	organization_type: "organization-types",
};

/**
 * Collects all unique relation values from an array of contacts
 * @param contacts Array of contact objects
 * @returns Object with relation endpoints as keys and sets of unique values as values
 */
export async function collectUniqueRelationValues(
	contacts: any[],
): Promise<Record<string, Set<string>>> {
	const uniqueValues: Record<string, Set<string>> = {};

	// Initialize sets for each relation field
	Object.values(relationFields).forEach((endpoint) => {
		uniqueValues[endpoint] = new Set<string>();
	});

	// Collect all unique values for each relation field
	for (const contact of contacts) {
		for (const [fieldKey, apiEndpoint] of Object.entries(relationFields)) {
			const rawValue = contact[fieldKey];
			if (!rawValue) continue;

			if (Array.isArray(rawValue)) {
				rawValue.forEach((val) => {
					const searchValue = getSearchValue(val);
					if (searchValue) uniqueValues[apiEndpoint].add(searchValue);
				});
			} else {
				const searchValue = getSearchValue(rawValue);
				if (searchValue) uniqueValues[apiEndpoint].add(searchValue);
			}
		}
	}

	// Log summary of unique values collected
	const _totalUniqueValues = Object.entries(uniqueValues).reduce(
		(total, [_endpoint, values]) => {
			if (values.size > 0) {
				// logger.info(`Collected ${values.size} unique values for ${endpoint}`);
			}
			return total + values.size;
		},
		0,
	);

	// logger.info(`Total unique relation values collected: ${totalUniqueValues}`);

	return uniqueValues;
}

/**
 * Processes relations for a contact using only the cache
 * @param contact Contact object
 * @returns Contact object with relations resolved from cache
 */
export async function handleRelations(contact: any): Promise<any> {
	const relationStats = {
		total: 0,
		resolved: 0,
		missing: 0,
	};

	for (const [fieldKey, apiEndpoint] of Object.entries(relationFields)) {
		const rawValue = contact[fieldKey];
		if (!rawValue) continue;

		const cache = relationCache[apiEndpoint];
		if (!cache) continue;

		if (Array.isArray(rawValue)) {
			relationStats.total += rawValue.length;

			const resolvedIds = rawValue
				.map((val) => {
					const searchValue = getSearchValue(val);
					if (!searchValue) return null;

					const id = cache.get(searchValue)?.id; //check
					if (id) relationStats.resolved++;
					else relationStats.missing++;

					return id || null;
				})
				.filter((id) => id !== null);

			contact[fieldKey] = resolvedIds;
		} else {
			relationStats.total++;

			const searchValue = getSearchValue(rawValue);
			if (searchValue) {
				const id = cache.get(searchValue)?.id; //check
				if (id) {
					relationStats.resolved++;
					contact[fieldKey] = id;
				} else {
					relationStats.missing++;
					contact[fieldKey] = null;
				}
			} else {
				contact[fieldKey] = null;
			}
		}
	}

	// Only log if there were relations to process
	if (relationStats.total > 0) {
		const hitRate =
			relationStats.total > 0
				? Math.round((relationStats.resolved / relationStats.total) * 100)
				: 0;
		if (relationStats.missing > 0) {
			logger.debug(
				`Relations for contact: ${relationStats.resolved}/${relationStats.total} resolved (${hitRate}% hit rate), ${relationStats.missing} missing`,
			);
		}
	}

	return contact;
}

export async function replaceRelations(job: Job) {
	const { contacts } = job.data as { contacts: any[]; listId?: number };
	const listId = job.data.listId as number | undefined;

	logger.info(
		{ jobId: job.id, count: contacts.length },
		"replaceRelations start",
	);

	const mapped = await Promise.all(
		contacts.map(async (contact) => ({
			id: contact.id,
			data: await handleRelations(contact),
		})),
	);

	const linkMap: Record<string, Array<[number, number]>> = {};

	for (const { id: contactId, data } of mapped) {
		for (const [fieldKey, endpoint] of Object.entries(relationFields)) {
			const val = data[fieldKey];
			if (Array.isArray(val)) {
				val.forEach((rid) => {
					linkMap[endpoint] ||= [];
					linkMap[endpoint].push([contactId, rid]);
				});
			} else if (typeof val === "number") {
				linkMap[endpoint] ||= [];
				linkMap[endpoint].push([contactId, val]);
			}
		}
	}

	if (listId) {
		linkMap.lists ||= [];
		contacts.forEach((c) => {
			linkMap.lists.push([c.id, listId]);
		});
	}

	const client = await pool.connect();
	try {
		await client.query("BEGIN");

		const contactIds = contacts.map((c) => c.id);

		for (const [endpoint, pairs] of Object.entries(linkMap)) {
			const isList = endpoint === "lists";
			const cfg = contactsJoinConfig[endpoint];
			if (!cfg) {
				logger.warn({ endpoint }, "replaceRelations: unknown endpoint, skip");
				continue;
			}

			if (!isList) {
				const delSql = `DELETE FROM ${cfg.table} WHERE ${cfg.leftCol} = ANY($1::int[])`;
				await client.query(delSql, [contactIds]);
			}

			const DB_CHUNK_SIZE = 500;
			for (let i = 0; i < pairs.length; i += DB_CHUNK_SIZE) {
				const chunk = pairs.slice(i, i + DB_CHUNK_SIZE);
				if (!chunk.length) continue;

				const placeholders = chunk
					.map((_, idx) => `($${idx * 2 + 1},$${idx * 2 + 2})`)
					.join(",");
				const flat = chunk.flat();

				const insSql = `INSERT INTO ${cfg.table} (${cfg.leftCol}, ${cfg.relCol})
						  VALUES ${placeholders}
						  ON CONFLICT DO NOTHING`;
				await client.query(insSql, flat);
			}
		}

		await client.query("COMMIT");
		logger.info({ jobId: job.id }, "replaceRelations done");
		return { replaced: contacts.length };
	} catch (err: any) {
		await client.query("ROLLBACK");
		logger.error(
			{ jobId: job.id, message: err.message, stack: err.stack },
			"replaceRelations failed",
		);
		throw err;
	} finally {
		client.release();
	}
}

export async function replaceOrgRelations(job: Job) {
	const { organizations, listId } = job.data as {
		organizations: any[];
		listId?: number;
	};

	logger.info(
		{ jobId: job.id, count: organizations.length },
		"replaceOrgRelations start",
	);

	const mapped = await Promise.all(
		organizations.map(async (org) => ({
			id: org.id,
			data: await handleRelations(org),
		})),
	);

	const linkMap: Record<string, Array<[number, number]>> = {};
	for (const { id: orgId, data } of mapped) {
		for (const [fieldKey, endpoint] of Object.entries(relationFields)) {
			const val = data[fieldKey];
			if (Array.isArray(val)) {
				val.forEach((rid: number) => {
					if (typeof rid !== "number") return;
					linkMap[endpoint] ||= [];
					linkMap[endpoint].push([orgId, rid]);
				});
			} else if (typeof val === "number") {
				linkMap[endpoint] ||= [];
				linkMap[endpoint].push([orgId, val]);
			}
		}
	}

	if (listId) {
		linkMap.lists ||= [];
		organizations.forEach((o) => {
			linkMap.lists.push([o.id, listId]);
		});
	}

	const client = await pool.connect();
	try {
		await client.query("BEGIN");

		const orgIds = organizations.map((o) => o.id);

		for (const [endpoint, pairs] of Object.entries(linkMap)) {
			const isList = endpoint === "lists";
			const cfg = orgsJoinConfig[endpoint];
			if (!cfg) {
				logger.warn(
					{ endpoint },
					"replaceOrgRelations: unknown endpoint, skip",
				);
				continue;
			}

			if (!isList) {
				const delSql = `DELETE FROM ${cfg.table} WHERE ${cfg.leftCol} = ANY($1::int[])`;
				await client.query(delSql, [orgIds]);
			}

			const DB_CHUNK_SIZE = 500;
			for (let i = 0; i < pairs.length; i += DB_CHUNK_SIZE) {
				const chunk = pairs.slice(i, i + DB_CHUNK_SIZE);
				if (!chunk.length) continue;

				const placeholders = chunk
					.map((_, idx) => `($${idx * 2 + 1},$${idx * 2 + 2})`)
					.join(",");
				const flat = chunk.flat();

				const insSql = `INSERT INTO ${cfg.table} (${cfg.leftCol}, ${cfg.relCol})
						  VALUES ${placeholders}
						  ON CONFLICT DO NOTHING`;
				await client.query(insSql, flat);
			}
		}

		await client.query("COMMIT");
		logger.info({ jobId: job.id }, "replaceOrgRelations done");
		return { replaced: organizations.length };
	} catch (err: any) {
		await client.query("ROLLBACK");
		logger.error(
			{ jobId: job.id, message: err.message, stack: err.stack },
			"replaceOrgRelations failed",
		);
		throw err;
	} finally {
		client.release();
	}
}

/**
 * Extracts a search value from a relation value
 * @param value Relation value (string, number, or object)
 * @returns Search value as string or undefined
 */
function getSearchValue(value: any): string | undefined {
	if (typeof value === "string" || typeof value === "number") {
		return String(value).trim();
	} else if (typeof value === "object" && value !== null) {
		return value?.name || value?.title;
	}
	return undefined;
}
