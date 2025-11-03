import API_ROUTES_STRAPI from "../api-routes/api-routes-strapi";
import type {
	ContactSalutation,
	Form_ContactSalutation,
} from "../types/contact-salutation";
import BaseService from "./common/base.service";

class ContactSalutationsService extends BaseService<
	ContactSalutation,
	Form_ContactSalutation
> {
	public constructor() {
		super(API_ROUTES_STRAPI.CONTACT_SALUTATIONS);
	}
}

export const contactSalutationsService = new ContactSalutationsService();
