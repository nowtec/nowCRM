import { API_ROUTES_STRAPI } from "../api-routes/api-routes-strapi";
import { Form_Term, Term } from "../types/term";
import BaseService from "./common/base.service";

class TermsService extends BaseService<Term , Form_Term> {
	public constructor() {
		super(API_ROUTES_STRAPI.TERMS);
	}
}

export const termsService = new TermsService();
