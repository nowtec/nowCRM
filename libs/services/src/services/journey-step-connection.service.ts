import {API_ROUTES_STRAPI} from "../api-routes/api-routes-strapi";
import { Form_JourneyStepConnection, JourneyStepConnection } from "../client";
import BaseService from "./common/base.service";

class JourneyStepConnectionsService extends BaseService<JourneyStepConnection, Form_JourneyStepConnection> {
	public constructor() {
		super(API_ROUTES_STRAPI.JOURNEY_STEP_CONNECTIONS);
	}
}

export const journeyStepConnectionsService = new JourneyStepConnectionsService();
