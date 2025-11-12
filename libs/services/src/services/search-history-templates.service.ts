import { APIRoutesStrapi } from "../api-routes/api-routes-strapi";
import type {
	Form_SearchHistoryTemplate,
	SearchHistoryTemplate,
} from "../types/search-history-template";
import BaseService from "./common/base.service";

class SearchHistoryTemplatesService extends BaseService<
	SearchHistoryTemplate,
	Form_SearchHistoryTemplate
> {
	public constructor() {
		super(APIRoutesStrapi.SEARCH_HISTORY_TEMPLATES);
	}
}

export const searchHistoryTemplatesService =
	new SearchHistoryTemplatesService();
