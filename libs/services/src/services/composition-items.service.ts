import { handleError, handleResponse, StandardResponse } from "server";
import API_ROUTES_STRAPI from "../api-routes/api-routes-strapi";
import type { CompositionItem, Form_CompositionItem } from "../types/composition-item";
import BaseService from "./common/base.service";
import Asset from "types/common/asset";
import { envServices } from "envConfig";

class CompositionItemsService extends BaseService<CompositionItem, Form_CompositionItem> {
  public constructor() {
    super(API_ROUTES_STRAPI.COMPOSITION_ITEM);
  }

  async uploadFile(
		files: any,
		compositionItemId: number,
		token: string,
	): Promise<StandardResponse<Asset[]>> {
		const url = `${envServices.STRAPI_URL}${API_ROUTES_STRAPI.UPLOAD}`;

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



