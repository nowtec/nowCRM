import API_ROUTES_STRAPI from "../api-routes/api-routes-strapi";
import type {
	DonationSubscription,
	Form_DonationSubscription,
} from "../types/donation-subscription";
import BaseService from "./common/base.service";

class DonationSubscriptionsService extends BaseService<
	DonationSubscription,
	Form_DonationSubscription
> {
	public constructor() {
		super(API_ROUTES_STRAPI.DONATION_SUBSCRIPTIONS);
	}
}

export const donationSubscriptionsService = new DonationSubscriptionsService();
