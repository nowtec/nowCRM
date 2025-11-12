import {APIRoutesStrapi} from "../api-routes/api-routes-strapi";
import { envServices } from "../envConfig";
import type Asset from "../types/common/asset";
import type {
	CompositionItem,
	Form_CompositionItem,
} from "../types/composition-item";
import BaseService from "./common/base.service";
import {
	handleError,
	handleResponse,
	type StandardResponse,
} from "./common/response.service";

class CompositionItemsService extends BaseService<
	CompositionItem,
	Form_CompositionItem
> {
	public constructor() {
		super(APIRoutesStrapi.COMPOSITION_ITEM);
	}

	async uploadFile(
		files: any,
		compositionItemId: number,
		token: string,
	): Promise<StandardResponse<Asset[]>> {
		const url = `${envServices.STRAPI_URL}${APIRoutesStrapi.UPLOAD}`;

		const formData = new FormData();
		for (let i = 0; i < files.length; i++) {
			formData.append("files", files[i]);
		}
		formData.append("ref", "api::composition-item.composition-item");
		formData.append("refId", compositionItemId.toString());
		formData.append("field", "attached_files");
		try {
			//TODO: remove config service from here
			const response = await fetch(url, {
				headers: this.getHeaders(false, token),
				cache: "no-store",
				method: "POST",
				body: formData,
			});
			return await handleResponse(response);
		} catch (error: any) {
			return handleError(error);
		}
	}
}

export const compositionItemsService = new CompositionItemsService();
