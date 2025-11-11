import {API_ROUTES_STRAPI} from "../api-routes/api-routes-strapi";
import { Form_JourneyStepRule, JourneyStepRule } from "../client";
import BaseService from "./common/base.service";

class JourneyStepRulesService extends BaseService<JourneyStepRule, Form_JourneyStepRule> {
	public constructor() {
		super(API_ROUTES_STRAPI.JOURNEY_STEP_RULES);
	}
}

export const journeyStepRulesService = new JourneyStepRulesService();
