import { APIRoutesStrapi } from "../api-routes/api-routes-strapi";
import { envServices } from "../envConfig";
import type { Form_List, List } from "../types/list";
import BaseService from "./common/base.service";
import {
	handleError,
	handleResponse,
	type StandardResponse,
} from "./common/response.service";

class ListsService extends BaseService<List, Form_List> {
	public constructor() {
		super(APIRoutesStrapi.LISTS);
	}

	async countContacts(
		id: number,
		token: string,
	): Promise<StandardResponse<number>> {
		const url = `${envServices.STRAPI_URL}${this.endpoint}/${id}/${APIRoutesStrapi.LISTS_COUNT_CONTACTS}`;
		try {
			const response = await fetch(url, {
				headers: this.getHeaders(false, token),
				cache: "no-store",
			});
			return await handleResponse(response);
		} catch (error: any) {
			return handleError<number>(error);
		}
	}

	async duplicate(
		listId: number,
		token: string,
	): Promise<StandardResponse<null>> {
		try {
			const url = `${envServices.STRAPI_URL}${APIRoutesStrapi.LISTS_DUPLICATE}`;

			const response = await fetch(url, {
				method: "POST",
				headers: this.getHeaders(true, token),
				body: JSON.stringify({ id: listId }),
			});

			return await handleResponse(response);
		} catch (error: any) {
			return handleError<null>(error);
		}
	}
}

export const listsService = new ListsService();
