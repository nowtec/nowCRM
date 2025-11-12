import { pool } from "./db";

export const relationCache: Record<
	string,
	Map<string, { id: number | null; documentId: string | null }>
> = {};
export const listContactsMap: Map<number, number[]> = new Map();

const relationFields: Record<string, string> = {
	contact_types: "contact_types",
	sources: "sources",
	// contact_extra_fields: "contact_extra_fields",
	contact_notes: "contact_notes",
	departments: "departments",
	contact_interests: "contact_interests",
	contact_ranks: "contact_ranks",
	keywords: "keywords",
	job_titles: "job_titles",
	tags: "tags",
	organizations: "organizations",
	industries: "industries",
	contacts: "contacts",
	channel: "channels",
	subscription_type: "subscription_types",
	lists: "lists",
	frequencies: "frequencies",
	media_types: "media_types",
	organization_types: "organization_types",
};

export async function loadRelationDictionaries() {
	await Promise.all(
		Object.entries(relationFields).map(async ([_key, table]) => {
			try {
				let res: any;

				if (table === "contacts") {
					res = await pool.query(
						`SELECT id, email, phone, mobile_phone, linkedin_url FROM "${table}"`,
					);
				} else {
					res = await pool.query(`SELECT id, name FROM "${table}"`);
				}

				console.log(`Query executed for "${table}", rows: ${res.rows.length}`);

				if (!res.rows.length) {
					console.warn(`Table "${table}" returned 0 rows`);
					return;
				}

				const map = new Map<
					string,
					{ id: number; documentId: string | null }
				>();

				for (const row of res.rows) {
					if (table === "contacts") {
						const keys = [
							row.email,
							row.phone,
							row.mobile_phone,
							row.linkedin_url,
						].filter(
							(v): v is string => typeof v === "string" && v.trim() !== "",
						);

						for (const key of keys) {
							const normalizedKey = key.trim().toLowerCase();
							if (!map.has(normalizedKey)) {
								map.set(normalizedKey, {
									id: row.id,
									documentId: row.document_id ?? null,
								});
							}
						}
					} else {
						const name = row.name;
						if (
							name &&
							typeof name === "string" &&
							name.trim() !== "" &&
							!map.has(name)
						) {
							map.set(name, {
								id: row.id,
								documentId: row.document_id ?? null,
							});
						} else if (table === "job_titles") {
						}
					}
				}

				if (map.size > 0) {
					relationCache[table] = map;
				} else {
					console.warn(
						`⚠ Table "${table}" produced an empty map (rows=${res.rows.length})`,
					);
				}

				if (table === "contacts") {
					const contactListRes = await pool.query(
						"SELECT contact_id, list_id FROM contacts_lists_links",
					);

					for (const row of contactListRes.rows) {
						const listId = row.list_id;
						const contactId = row.contact_id;
						if (!listContactsMap.has(listId)) {
							listContactsMap.set(listId, []);
						}
						listContactsMap.get(listId)?.push(contactId);
					}
				}
			} catch (err: unknown) {
				if (err instanceof Error) {
					console.error(`Error loading table "${table}": ${err.message}`);
				} else {
					console.error(`Unknown error loading table "${table}"`);
				}
			}
		}),
	);
}
