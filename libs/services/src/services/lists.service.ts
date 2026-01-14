import { API_ROUTES_STRAPI } from "../api-routes/api-routes-strapi";
import { envServices } from "../env-config";
import type { DocumentId } from "../types/common/base-type";
import type { Form_List, List } from "../types/list";
import BaseService from "./common/base.service";
import {
	handleError,
	handleResponse,
	type StandardResponse,
} from "./common/response.service";

class ListsService extends BaseService<List, Form_List> {
	public constructor() {
		super(API_ROUTES_STRAPI.LISTS);
	}

	async countContacts(
		id: DocumentId,
		token: string,
	): Promise<StandardResponse<{ count: number }>> {
		const url = new URL(
			`api/${this.endpoint}/${id}/${API_ROUTES_STRAPI.LISTS_COUNT_CONTACTS}`,
			envServices.API_GATEWAY,
		);
		try {
			const response = await fetch(url, {
				headers: this.getHeaders(false, token),
				cache: "no-store",
			});
			return await handleResponse(response);
		} catch (error: any) {
			return handleError<{ count: number }>(error);
		}
	}

	async duplicate(
		listId: DocumentId,
		token: string,
	): Promise<StandardResponse<null>> {
		try {
			const url = new URL(
				`api/${API_ROUTES_STRAPI.LISTS_DUPLICATE}`,
				envServices.API_GATEWAY,
			);

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
