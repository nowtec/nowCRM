import { APIRoutesStrapi } from "../api-routes/api-routes-strapi";
import type {
	Form_SubscriptionType,
	SubscriptionType,
} from "../types/subscription-type";
import BaseService from "./common/base.service";

class SubscriptionTypesService extends BaseService<
	SubscriptionType,
	Form_SubscriptionType
> {
	public constructor() {
		super(APIRoutesStrapi.SUBSCRIPTION_TYPES);
	}
}

export const subscriptionTypesService = new SubscriptionTypesService();
