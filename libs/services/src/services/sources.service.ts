import { APIRoutesStrapi } from "../api-routes/api-routes-strapi";
import type { Form_Source, Source } from "../types/source";
import BaseService from "./common/base.service";

class SourcesService extends BaseService<Source, Form_Source> {
	public constructor() {
		super(APIRoutesStrapi.SOURCES);
	}
}

export const sourcesService = new SourcesService();
