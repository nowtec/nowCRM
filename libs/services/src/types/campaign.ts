import type { Action } from "./action";
import type { CampaignCategory } from "./campaign-category";
import type { BaseFormType, BaseType } from "./common/base_type";
import type { StrapiConnect } from "./common/StrapiQuery";
import type { Composition } from "./composition";
import type { DonationTransaction } from "./donation-transaction";
import type { Journey } from "./journey";
export interface Campaign extends BaseType {
	description: string;
	campaign_category: CampaignCategory[];
	actions: Action[];
	donation_transactions: DonationTransaction[];
	compositions: Composition[];
	journeys: Journey[];
}

export interface Form_Campaign extends BaseFormType {
	description: string;
	campaign_category: StrapiConnect;
	actions: StrapiConnect;
	donation_transactions: StrapiConnect;
	compositions: StrapiConnect;
	journeys: StrapiConnect;
}
