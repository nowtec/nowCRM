import API_ROUTES_STRAPI from "../api-routes/api-routes-strapi";
import type { ContactTitle, Form_ContactTitle } from "../types/contact-title";
import BaseService from "./common/base.service";

class ContactTitlesService extends BaseService<
	ContactTitle,
	Form_ContactTitle
> {
	public constructor() {
		super(API_ROUTES_STRAPI.CONTACT_TITLES);
	}
}

export const contactTitlesService = new ContactTitlesService();
