import { APIRoutesStrapi } from "../api-routes/api-routes-strapi";
import type {
	Form_SearchHistory,
	SearchHistory,
} from "../types/search-history";
import BaseService from "./common/base.service";

class SearchHistoriesService extends BaseService<
	SearchHistory,
	Form_SearchHistory
> {
	public constructor() {
		super(APIRoutesStrapi.SEARCH_HISTORIES);
	}
}

export const searchHistoriesService = new SearchHistoriesService();
