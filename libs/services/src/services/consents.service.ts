import API_ROUTES_STRAPI from "../api-routes/api-routes-strapi";
import type { Consent, Form_Consent } from "../types/consent";
import BaseService from "./common/base.service";

class ConsentsService extends BaseService<Consent, Form_Consent> {
	public constructor() {
		super(API_ROUTES_STRAPI.CONSENT);
	}
}

export const consentsService = new ConsentsService();
