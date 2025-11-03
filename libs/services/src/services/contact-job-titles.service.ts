import API_ROUTES_STRAPI from "../api-routes/api-routes-strapi";
import type {
	ContactJobTitle,
	Form_ContactJobTitle,
} from "../types/contact-job-title";
import BaseService from "./common/base.service";

class ContactJobTitlesService extends BaseService<
	ContactJobTitle,
	Form_ContactJobTitle
> {
	public constructor() {
		super(API_ROUTES_STRAPI.CONTACT_JOB_TITLES);
	}
}

export const contactJobTitlesService = new ContactJobTitlesService();
