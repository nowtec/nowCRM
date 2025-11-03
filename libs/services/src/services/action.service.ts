import API_ROUTES_STRAPI from "../api-routes/api-routes-strapi";

import type { Action, Form_Action } from "../types/action";
import BaseService from "./common/base.service";

class ActionsService extends BaseService<Action, Form_Action> {
	public constructor() {
		super(API_ROUTES_STRAPI.ACTIONS);
	}
}
export const actionsService = new ActionsService();
