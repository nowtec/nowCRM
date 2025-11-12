import { APIRoutesStrapi } from "../api-routes/api-routes-strapi";
import type { Form_Tag, Tag } from "../types/tag";
import BaseService from "./common/base.service";

class TagsService extends BaseService<Tag, Form_Tag> {
	public constructor() {
		super(APIRoutesStrapi.TAGS);
	}
}

export const tagsService = new TagsService();
