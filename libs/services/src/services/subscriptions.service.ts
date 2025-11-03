import API_ROUTES_STRAPI from "../api-routes/api-routes-strapi";
import type { Form_Subscription, Subscription } from "../types/subscription";
import BaseService from "./common/base.service";

class SubscriptionsService extends BaseService<
	Subscription,
	Form_Subscription
> {
	public constructor() {
		super(API_ROUTES_STRAPI.SUBSCRIPTIONS);
	}
}

export const subscriptionsService = new SubscriptionsService();
