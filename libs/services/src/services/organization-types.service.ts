import { APIRoutesStrapi } from "../api-routes/api-routes-strapi";
import type {
	Form_OrganizationType,
	OrganizationType,
} from "../types/organization-type";
import BaseService from "./common/base.service";

class OrganizationTypesService extends BaseService<
	OrganizationType,
	Form_OrganizationType
> {
	public constructor() {
		super(APIRoutesStrapi.ORGANIZATION_TYPES);
	}
}

export const organizationTypesService = new OrganizationTypesService();
