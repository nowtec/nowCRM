import API_ROUTES_STRAPI from "../api-routes/api-routes-strapi";
import type {
	ContactInterest,
	Form_ContactInterest,
} from "../types/contact-interest";
import BaseService from "./common/base.service";

class ContactInterestsService extends BaseService<
	ContactInterest,
	Form_ContactInterest
> {
	public constructor() {
		super(API_ROUTES_STRAPI.CONTACT_INTERESTS);
	}
}

export const contactInterestsService = new ContactInterestsService();
