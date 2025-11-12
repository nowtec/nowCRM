import { APIRoutesStrapi } from "../api-routes/api-routes-strapi";
import type { Form_Frequency, Frequency } from "../types/frequncy";
import BaseService from "./common/base.service";

class FrequenciesService extends BaseService<Frequency, Form_Frequency> {
	public constructor() {
		super(APIRoutesStrapi.FREQUENCY);
	}
}

export const frequenciesService = new FrequenciesService();
