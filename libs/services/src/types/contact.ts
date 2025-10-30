import { LanguageKeys } from "static/languages";
import type { BaseFormType, BaseType, DocumentId } from "./common/base_type";
import { Consent } from "./consent";
import { ContactInterest } from "./contact-interest";
import { Department } from "./department";
import { List } from "./list";
import { Organization } from "./organization";
import { JourneyStep } from "./journey-step";
import { Journey } from "./journey";
import { Subscription } from "./subscription";
import { Action } from "./action";
import { ContactDocument } from "./contact-document";
import { JourneyPassedStep } from "./journey-passed-step";
import { Keyword } from "./keyword";
import { ContactRank } from "./contact-rank";
import { ContactType } from "./contact-type";
import { Source } from "./source";
import { Contact_Note } from "./contact-note";
import { Industry } from "./industry";
import { MediaType } from "./media-type";
import { Survey } from "./survey";
import { DonationTransaction } from "./donation-transaction";
import { DonationSubscription } from "./donation-subscription";
import { Tag } from "./tag";
import { ContactTitle } from "./contact-title";
import { ContactSalutation } from "./contact-salutation";
import { ContactJobTitle } from "./contact-job-title";
import { StrapiConnect } from "./common/StrapiQuery";

export type contactStatuses = 	| "new"
		| "closed"
		| "contacted"
		| "negotiating"
		| "registered"
		| "backfill"
		| "prospect/marketing"
		| "customer/no marketing";

export interface Contact extends Omit<BaseType,'name'> {
    first_name: string;
    last_name: string;
    function: string;
    address_line1: string;
    address_line2: string;
    location: string;
    canton: string;
    organization: Organization
    lists: List[]
    phone: string;
    contact_interests: ContactInterest[];
    department: Department;
    consent: Consent
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
    journey_passed_steps: JourneyPassedStep[]
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
    media_types: MediaType[]
    events: Event[]
    surveys: Survey[];
    donation_transactions: DonationTransaction[];
    donation_subscriptions: DonationSubscription[];
    tags: Tag;
    title: ContactTitle
    salutation: ContactSalutation
    job_title: ContactJobTitle
    job_description: string;
    duration_role: string;
    connection_degree: string;
}

export interface Form_Contact extends Omit<BaseFormType,'name'> {
      first_name: string;
    last_name: string;
    function: string;
    address_line1: string;
    address_line2: string;
    location: string;
    canton: string;
    organization: Organization
    lists: StrapiConnect
    phone: string;
    contact_interests: StrapiConnect;
    department: DocumentId;
    consent: DocumentId
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
    journey_passed_steps: StrapiConnect
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
    media_types: StrapiConnect
    events: StrapiConnect
    surveys: StrapiConnect
    donation_transactions: StrapiConnect
    donation_subscriptions: StrapiConnect
    tags: DocumentId
    title: DocumentId
    salutation: DocumentId
    job_title: DocumentId
    job_description: string;
    duration_role: string;
    connection_degree: string;
}
