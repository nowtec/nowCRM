import { APIRoutesStrapi } from "../api-routes/api-routes-strapi";
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
		super(APIRoutesStrapi.DONATION_SUBSCRIPTIONS);
	}
}

export const donationSubscriptionsService = new DonationSubscriptionsService();
