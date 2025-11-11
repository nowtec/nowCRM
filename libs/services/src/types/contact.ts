import type { LanguageKeys } from "../static/languages";
import type { Action } from "./action";
import type { BaseFormType, BaseType, DocumentId } from "./common/base_type";
import type { StrapiConnect } from "./common/StrapiQuery";
import type { Consent } from "./consent";
import type { ContactDocument } from "./contact-document";
import type { ContactInterest } from "./contact-interest";
import type { ContactJobTitle } from "./contact-job-title";
import type { Contact_Note } from "./contact-note";
import type { ContactRank } from "./contact-rank";
import type { ContactSalutation } from "./contact-salutation";
import type { ContactTitle } from "./contact-title";
import type { ContactType } from "./contact-type";
import type { Department } from "./department";
import type { DonationSubscription } from "./donation-subscription";
import type { DonationTransaction } from "./donation-transaction";
import type { Industry } from "./industry";
import type { Journey } from "./journey";
import type { JourneyPassedStep } from "./journey-passed-step";
import type { JourneyStep } from "./journey-step";
import type { Keyword } from "./keyword";
import type { List } from "./list";
import type { MediaType } from "./media-type";
import type { Organization } from "./organization";
import type { Source } from "./source";
import type { Subscription } from "./subscription";
import type { Survey } from "./survey";
import type { Tag } from "./tag";
import type { SurveyItem } from "./survey-item";

export type contactStatuses =
	| "new"
	| "closed"
	| "contacted"
	| "negotiating"
	| "registered"
	| "backfill"
	| "prospect/marketing"
	| "customer/no marketing";

export interface Contact extends Omit<BaseType, "name"> {
	first_name: string;
	last_name: string;
	email: string;
	function: string;
	address_line1: string;
	address_line2: string;
	location: string;
	canton: string;
	organization: Organization;
	lists: List[];
	phone: string;
	contact_interests: ContactInterest[];
	department: Department;
	consent: Consent;
	language: LanguageKeys;
	gender: string;
	mobile_phone: string;
	plz: string;
	journey_steps: JourneyStep[];
	journeys: Journey[];
	subscriptions: Subscription[];
	actions: Action[];
	priority: string;
	contact_status: contactStatuses;
	description: string;
	contact_documents: ContactDocument[];
	country: string;
	linkedin_url: string;
	facebook_url: string;
	twitter_url: string;
	journey_passed_steps: JourneyPassedStep[];
	keywords: Keyword[];
	last_access: Date;
	account_created_at: Date;
	ranks: ContactRank[];
	contact_types: ContactType[];
	sources: Source[];
	zip: number;
	website_url: string;
	contact_notes: Contact_Note[];
	industry: Industry;
	unsubscribe_token: string;
	birth_date: Date;
	media_types: MediaType[];
	events: Event[];
	surveys: Survey[];
	survey_items: SurveyItem[];
	donation_transactions: DonationTransaction[];
	donation_subscriptions: DonationSubscription[];
	tags: Tag[];
	title: ContactTitle;
	salutation: ContactSalutation;
	job_title: ContactJobTitle;
	job_description: string;
	duration_role: string;
	connection_degree: string;
}

export interface Form_Contact extends Omit<BaseFormType, "name"> {
	first_name: string;
	last_name: string;
	function: string;
	email: string;
	address_line1: string;
	address_line2: string;
	location: string;
	canton: string;
	organization?: DocumentId;
	lists: StrapiConnect;
	phone: string;
	contact_interests: StrapiConnect;
	department?: DocumentId;
	consent: DocumentId;
	language: LanguageKeys;
	gender: string;
	mobile_phone: string;
	plz: string;
	journey_steps: StrapiConnect;
	journeys: StrapiConnect;
	subscriptions: StrapiConnect;
	actions: StrapiConnect;
	priority: string;
	contact_status: contactStatuses;
	description: string;
	contact_documents: StrapiConnect;
	country: string;
	linkedin_url: string;
	facebook_url: string;
	twitter_url: string;
	journey_passed_steps: StrapiConnect;
	keywords: StrapiConnect;
	last_access: Date;
	account_created_at: Date;
	ranks: StrapiConnect;
	contact_types: StrapiConnect;
	sources: StrapiConnect;
	zip: number;
	website_url: string;
	contact_notes: StrapiConnect;
	industry: DocumentId;
	unsubscribe_token: string;
	birth_date: Date;
	media_types: StrapiConnect;
	events: StrapiConnect;
	surveys: StrapiConnect;
	survey_items: StrapiConnect;
	donation_transactions: StrapiConnect;
	donation_subscriptions: StrapiConnect;
	tags: StrapiConnect;
	title: DocumentId;
	salutation: DocumentId;
	job_title: DocumentId;
	job_description: string;
	duration_role: string;
	connection_degree: string;
}
