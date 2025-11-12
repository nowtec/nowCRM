import { APIRoutesStrapi } from "../api-routes/api-routes-strapi";
import type { Form_Survey, Survey } from "../types/survey";
import BaseService from "./common/base.service";

class SurveysService extends BaseService<Survey, Form_Survey> {
	public constructor() {
		super(APIRoutesStrapi.SURVEYS);
	}
}

export const surveysService = new SurveysService();
