import { APIRoutesStrapi } from "../api-routes/api-routes-strapi";
import type { Contact_Note, Form_Contact_Note } from "../types/contact-note";
import BaseService from "./common/base.service";

class ContactNotesService extends BaseService<Contact_Note, Form_Contact_Note> {
	public constructor() {
		super(APIRoutesStrapi.CONTACT_NOTES);
	}
}

export const contactNotesService = new ContactNotesService();
