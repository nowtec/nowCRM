import API_ROUTES_STRAPI from "../api-routes/api-routes-strapi";
import type { Contact_Note, Form_Contact_Note } from "../types/contact-note";
import BaseService from "./common/base.service";

class ContactNotesService extends BaseService<Contact_Note, Form_Contact_Note> {
	public constructor() {
		super(API_ROUTES_STRAPI.CONTACT_NOTES);
	}
}

export const contactNotesService = new ContactNotesService();
