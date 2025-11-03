import API_ROUTES_STRAPI from "../api-routes/api-routes-strapi";
import type { Campaign, Form_Campaign } from "../types/campaign";
import BaseService from "./common/base.service";

class CampaignsService extends BaseService<Campaign, Form_Campaign> {
	public constructor() {
		super(API_ROUTES_STRAPI.CAMPAIGNS);
	}
}

export const campaignsService = new CampaignsService();
