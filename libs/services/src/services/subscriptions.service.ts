import { APIRoutesStrapi } from "../api-routes/api-routes-strapi";
import type { Form_Subscription, Subscription } from "../types/subscription";
import BaseService from "./common/base.service";

class SubscriptionsService extends BaseService<
	Subscription,
	Form_Subscription
> {
	public constructor() {
		super(APIRoutesStrapi.SUBSCRIPTIONS);
	}
}

export const subscriptionsService = new SubscriptionsService();
