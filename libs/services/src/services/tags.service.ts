import API_ROUTES_STRAPI from "../api-routes/api-routes-strapi";
import type { Form_Tag, Tag } from "../types/tag";
import BaseService from "./common/base.service";

class TagsService extends BaseService<Tag, Form_Tag> {
	public constructor() {
		super(API_ROUTES_STRAPI.TAGS);
	}
}

export const tagsService = new TagsService();
