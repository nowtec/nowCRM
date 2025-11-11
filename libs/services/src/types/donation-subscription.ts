import type { BaseFormType, BaseType, DocumentId } from "./common/base_type";
import type { Contact } from "./contact";
export interface DonationSubscription extends Omit<BaseType, "name"> {
	ammount: number;
	contact: Contact;
	payment_method: string;
	currency: string;
	payment_provider: string;
	interval: string;
	subscription_token: string;
	raw_data: string;
}

export interface Form_DonationSubscription extends Omit<BaseFormType, "name"> {
	ammount: number;
	contact: DocumentId;
	payment_method: string;
	currency: string;
	payment_provider: string;
	interval: string;
	subscription_token: string;
	raw_data: string;
}
