import {APIRoutesStrapi} from "../api-routes/api-routes-strapi";
import type {
	CampaignCategory,
	Form_CampaignCategory,
} from "../types/campaign-category";
import BaseService from "./common/base.service";

class CampaignCategoriesService extends BaseService<
	CampaignCategory,
	Form_CampaignCategory
> {
	public constructor() {
		super(APIRoutesStrapi.CAMPAIGN_CATEGORIES);
	}
}

export const campaignCategoriesService = new CampaignCategoriesService();
