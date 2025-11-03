import API_ROUTES_STRAPI from "../api-routes/api-routes-strapi";
import type {
	ContactDocument,
	Form_ContactDocument,
} from "../types/contact-document";
import BaseService from "./common/base.service";

class ContactDocumentsService extends BaseService<
	ContactDocument,
	Form_ContactDocument
> {
	public constructor() {
		super(API_ROUTES_STRAPI.CONTACT_DOCUMENTS);
	}
}

export const contactDocumentsService = new ContactDocumentsService();
