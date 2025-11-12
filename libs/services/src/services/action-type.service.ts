// src/services/contact.service.ts

import {APIRoutesStrapi} from "../api-routes/api-routes-strapi";
import type { ActionType, Form_ActionType } from "../types/action-type";
import BaseService from "./common/base.service";

/**
 * Service class to handle Contact-related API interactions.
 * Extends the generic BaseService with Contact-specific types.
 */
class ActionTypeService extends BaseService<ActionType, Form_ActionType> {
	public constructor() {
		super(APIRoutesStrapi.ACTION_TYPES);
	}
}
export const actionTypeService = new ActionTypeService();
