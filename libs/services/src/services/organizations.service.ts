import API_ROUTES_STRAPI from "../api-routes/api-routes-strapi";
import { envServices } from "../envConfig";
import type { Form_Organization, Organization } from "../types/organization";
import BaseService from "./common/base.service";
import {
	handleError,
	handleResponse,
	type StandardResponse,
} from "./common/response.service";

class OrganizationsService extends BaseService<
	Organization,
	Form_Organization
> {
	public constructor() {
		super(API_ROUTES_STRAPI.ORGANIZATIONS);
	}

	async duplicate(
		organizationId: number,
		token: string,
	): Promise<StandardResponse<null>> {
		try {
			const url = `${envServices.STRAPI_URL}${API_ROUTES_STRAPI.ORGANIZATIONS_DUPLICATE}`;

			const response = await fetch(url, {
				method: "POST",
				headers: this.getHeaders(true, token),
				body: JSON.stringify({ id: organizationId }),
			});

			return await handleResponse(response);
		} catch (error: any) {
			return handleError<null>(error);
		}
	}
}

export const organizationsService = new OrganizationsService();
