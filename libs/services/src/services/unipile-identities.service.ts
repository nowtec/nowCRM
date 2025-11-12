import { APIRoutesStrapi } from "../api-routes/api-routes-strapi";
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
		super(APIRoutesStrapi.UNIPILE_IDENTITIES);
	}
}

export const unipileIdentitiesService = new UnipileIdentitiesService();
