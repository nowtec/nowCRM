import API_ROUTES_STRAPI from "../api-routes/api-routes-strapi";
import type { Form_SurveyItem, SurveyItem } from "../types/survey-item";
import BaseService from "./common/base.service";

// TODO: Replace any/any with correct types when available
class SurveyItemsService extends BaseService<SurveyItem, Form_SurveyItem> {
	public constructor() {
		super(API_ROUTES_STRAPI.SURVEY_ITEMS);
	}
}

export const surveyItemsService = new SurveyItemsService();
