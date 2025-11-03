import API_ROUTES_STRAPI from "../api-routes/api-routes-strapi";
import type {
	Form_UnipileIdentity,
	UnipileIdentity,
} from "../types/unipie-identity";
import BaseService from "./common/base.service";

class UnipileIdentitiesService extends BaseService<
	UnipileIdentity,
	Form_UnipileIdentity
> {
	public constructor() {
		super(API_ROUTES_STRAPI.UNIPILE_IDENTITIES);
	}
}

export const unipileIdentitiesService = new UnipileIdentitiesService();
