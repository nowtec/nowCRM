import API_ROUTES_STRAPI from "../api-routes/api-routes-strapi";
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
		super(API_ROUTES_STRAPI.CAMPAIGN_CATEGORIES);
	}
}

export const campaignCategoriesService = new CampaignCategoriesService();
