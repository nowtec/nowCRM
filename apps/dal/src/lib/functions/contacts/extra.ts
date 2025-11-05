import axios from "axios";
import { env } from "@/common/utils/env-config";

interface ExtraField {
	label: string;
	value: string;
}

export const createContactExtraFields = async (
	contactId: number,
	extraFields: ExtraField[],
): Promise<void> => {
	if (!extraFields || extraFields.length === 0) {
		console.log(" No extra fields to create.");
		return;
	}

	for (const [_index, field] of extraFields.entries()) {
		try {
			const _response = await axios.post(
				`${env.STRAPI_URL}/api/contact-extra-fields`,
				{
					data: {
						name: field.label,
						value: field.value,
						contact: contactId,
					},
				},
				{
					headers: {
						Authorization: `Bearer ${env.DAL_STRAPI_API_TOKEN}`,
						"Content-Type": "application/json",
					},
				},
			);
		} catch (error: any) {
			if (axios.isAxiosError(error)) {
				console.error("Axios error message:", error.message);
				console.error("Axios error code:", error.code);

				if (error.response) {
					console.error("Strapi response status:", error.response.status);
					console.error(
						"Strapi response data:",
						JSON.stringify(error.response.data, null, 2),
					);
				} else if (error.request) {
					console.error(" No response received from Strapi.");
					console.error(" Request data:", error.request);
				} else {
					console.error("Axios setup error:", error.message);
				}
			} else {
				console.error("Unknown error:", error);
			}
		}
	}
};
