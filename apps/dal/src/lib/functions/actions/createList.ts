import axios from "axios";
import { env } from "@/common/utils/env-config";
import { logger } from "@/server";

export const createList = async (list_name: string) => {
	try {
		const response = await axios.post(
			`${env.STRAPI_URL}/api/lists`,
			{
				data: {
					name: list_name,
				},
			},
			{
				headers: {
					Authorization: `Bearer ${env.DAL_STRAPI_API_TOKEN}`,
				},
			},
		);

		const created = response.data?.data;

		logger.info(` Created list "${list_name}" → ID: ${created?.id}`);
		return created;
	} catch (err: any) {
		logger.error(` Failed to create list "${list_name}": ${err.message}`);
		return null;
	}
};
