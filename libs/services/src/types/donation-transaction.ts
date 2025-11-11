import type { BaseFormType, BaseType, DocumentId } from "./common/base_type";
import type { Contact } from "./contact";
export interface DonationTransaction extends Omit<BaseType, "name"> {
	ammount: number;
	contact: Contact;
	user_agent: string;
	campaign_name: string;
	campaign_id: DocumentId;
	card_holder_name: string;
	payment_method: string;
	payment_provider: string;
	user_ip: string;
	currency: string;
	epp_transaction_id: string;
	raw_data: string;
	purpose: string;
	donation_status: string;
}

export interface Form_DonationTransaction extends Omit<BaseFormType, "name"> {
	ammount: number;
	contact: DocumentId;
	user_agent: string;
	campaign_name: string;
	campaign_id: DocumentId;
	card_holder_name: string;
	payment_method: string;
	payment_provider: string;
	user_ip: string;
	currency: string;
	epp_transaction_id: string;
	raw_data: string;
	purpose: string;
	donation_status: string;
}
