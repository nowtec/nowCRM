import API_ROUTES_STRAPI from "../api-routes/api-routes-strapi";
import type { Form_Source, Source } from "../types/source";
import BaseService from "./common/base.service";

class SourcesService extends BaseService<Source, Form_Source> {
	public constructor() {
		super(API_ROUTES_STRAPI.SOURCES);
	}
}

export const sourcesService = new SourcesService();
