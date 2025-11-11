import {API_ROUTES_STRAPI} from "../api-routes/api-routes-strapi";
import { Form_JourneyStepRuleScore, JourneyStepRuleScore } from "../client";
import BaseService from "./common/base.service";

class JourneyStepRuleScoresService extends BaseService<JourneyStepRuleScore, Form_JourneyStepRuleScore> {
	public constructor() {
		super(API_ROUTES_STRAPI.JOURNEY_STEP_RULE_SCORES);
	}
}

export const journeyStepRuleScoresService = new JourneyStepRuleScoresService();
