import { APIRoutesStrapi } from "../api-routes/api-routes-strapi";
import type { Action, Form_Action } from "../types/action";
import BaseService from "./common/base.service";

class ActionScoreItemsService extends BaseService<Action, Form_Action> {
	public constructor() {
		super(APIRoutesStrapi.ACTION_SCORE_ITEMS);
	}
}
export const actionScoreItemsService = new ActionScoreItemsService();
