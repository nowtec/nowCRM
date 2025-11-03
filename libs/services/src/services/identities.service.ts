import API_ROUTES_STRAPI from "../api-routes/api-routes-strapi";
import type { Form_Identity, Identity } from "../types/identity";
import BaseService from "./common/base.service";

class IdentitiesService extends BaseService<Identity, Form_Identity> {
	public constructor() {
		super(API_ROUTES_STRAPI.IDENTITIES);
	}
}

export const identitiesService = new IdentitiesService();
