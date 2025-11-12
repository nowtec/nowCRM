// functions/helpers/sanitizeContacts.ts
import { relationFields } from "../helpers/relations";

const relationFieldSet = new Set<string>(Object.keys(relationFields));

export function sanitizeContacts(contacts: any[]): any[] {
	return contacts
		.map((c) => {
			const out: Record<string, any> = {};
			for (const [k, v] of Object.entries(c)) {
				if (relationFieldSet.has(k)) continue;
				if (v === null || v === undefined) continue;
				if (["string", "number", "boolean"].includes(typeof v)) {
					if (typeof v === "string") {
						const t = v.trim();
						if (t !== "") out[k] = t;
					} else {
						out[k] = v;
					}
				}
			}
			return out;
		})
		.filter((obj) => Object.values(obj).some((v) => v !== null && v !== ""));
}
