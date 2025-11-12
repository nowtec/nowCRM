import {APIRoutesStrapi} from "../api-routes/api-routes-strapi";
import type { Consent, Form_Consent } from "../types/consent";
import BaseService from "./common/base.service";

class ConsentsService extends BaseService<Consent, Form_Consent> {
	public constructor() {
		super(APIRoutesStrapi.CONSENT);
	}
}

export const consentsService = new ConsentsService();
