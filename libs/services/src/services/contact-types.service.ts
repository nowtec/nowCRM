import API_ROUTES_STRAPI from "../api-routes/api-routes-strapi";
import type { ContactType, Form_ContactType } from "../types/contact-type";
import BaseService from "./common/base.service";

class ContactTypesService extends BaseService<ContactType, Form_ContactType> {
	public constructor() {
		super(API_ROUTES_STRAPI.CONTACT_TYPES);
	}
}

export const contactTypesService = new ContactTypesService();
