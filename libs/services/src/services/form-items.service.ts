import { APIRoutesStrapi } from "../api-routes/api-routes-strapi";
import type { Form_FormEntityItem, FormEntityItem } from "../types/form-item";
import BaseService from "./common/base.service";

class FormItemsService extends BaseService<
	FormEntityItem,
	Form_FormEntityItem
> {
	public constructor() {
		super(APIRoutesStrapi.FORM_ITEMS);
	}
}

export const formItemsService = new FormItemsService();
