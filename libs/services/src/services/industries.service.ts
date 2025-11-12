import { APIRoutesStrapi } from "../api-routes/api-routes-strapi";
import type { Form_Industry, Industry } from "../types/industry";
import BaseService from "./common/base.service";

class IndustriesService extends BaseService<Industry, Form_Industry> {
	public constructor() {
		super(APIRoutesStrapi.INDUSTRY);
	}
}

export const industriesService = new IndustriesService();
