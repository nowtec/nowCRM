import API_ROUTES_STRAPI from "../api-routes/api-routes-strapi";
import type {
	DonationTransaction,
	Form_DonationTransaction,
} from "../types/donation-transaction";
import BaseService from "./common/base.service";

class DonationTransactionsService extends BaseService<
	DonationTransaction,
	Form_DonationTransaction
> {
	public constructor() {
		super(API_ROUTES_STRAPI.DONATION_TRANSACTIONS);
	}
}

export const donationTransactionsService = new DonationTransactionsService();
