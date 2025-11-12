import {APIRoutesStrapi} from "../api-routes/api-routes-strapi";
import type { ContactRank, Form_ContactRank } from "../types/contact-rank";
import BaseService from "./common/base.service";

class ContactRanksService extends BaseService<ContactRank, Form_ContactRank> {
	public constructor() {
		super(APIRoutesStrapi.CONTACT_RANKS);
	}
}

export const contactRanksService = new ContactRanksService();
