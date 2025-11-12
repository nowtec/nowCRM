import { APIRoutesStrapi } from "../api-routes/api-routes-strapi";
import type { Form_TextBlock, TextBlock } from "../types/text-block";
import BaseService from "./common/base.service";

class TextblocksService extends BaseService<TextBlock, Form_TextBlock> {
	public constructor() {
		super(APIRoutesStrapi.TEXTBLOCK);
	}
}

export const textblocksService = new TextblocksService();
