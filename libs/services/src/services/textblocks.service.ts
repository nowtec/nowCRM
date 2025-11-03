import API_ROUTES_STRAPI from "../api-routes/api-routes-strapi";
import type { Form_TextBlock, TextBlock } from "../types/text-block";
import BaseService from "./common/base.service";

class TextblocksService extends BaseService<TextBlock, Form_TextBlock> {
	public constructor() {
		super(API_ROUTES_STRAPI.TEXTBLOCK);
	}
}

export const textblocksService = new TextblocksService();
