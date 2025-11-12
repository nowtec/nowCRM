import { env } from "@/common/utils/env-config";
import { fetchJson } from "@/common/utils/fetch-json";

interface ExtraField {
	label: string;
	value: string;
}

export const createContactExtraFields = async (
	contactId: number,
	extraFields: ExtraField[],
): Promise<void> => {
	if (!extraFields || extraFields.length === 0) {
		console.log("No extra fields to create.");
		return;
	}

	for (const field of extraFields) {
		try {
			await fetchJson(`${env.DAL_STRAPI_API_URL}/api/contact-extra-fields`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${env.DAL_STRAPI_API_TOKEN}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					data: {
						name: field.label,
						value: field.value,
						contact: contactId,
					},
				}),
				timeout: 30000,
			});
		} catch (error: any) {
			if (error.name === "AbortError") {
				console.error("Request timed out while creating extra field:", field.label);
			} else {
				console.error("Failed to create extra field:", field.label);
				console.error("Error:", error.message || error);
			}
		}
	}
};
