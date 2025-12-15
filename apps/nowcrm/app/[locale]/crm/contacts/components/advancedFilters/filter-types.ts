import type { ServiceName } from "@nowcrm/services";

// Export FIELD_TYPES, FILTER_CATEGORIES, and RELATION_META for use with FilterGroupComponent
export const FIELD_TYPES: Record<
	string,
	"text" | "number" | "date" | "relation" | "enum"
> = {
	first_name: "text",
	last_name: "text",
	phone: "text",
	email: "text",
	gender: "enum",
	mobile_phone: "text",
	address_line1: "text",
	address_line2: "text",
	location: "text",
	canton: "text",
	zip: "number",
	country: "text",
	birth_date: "date",
	linkedin_url: "text",
	facebook_url: "text",
	twitter_url: "text",
	language: "enum",
	language_free_form: "text",
	contact_types: "relation",
	contact_interests: "relation",
	subscriptions: "relation",
	ranks: "relation",
	department: "relation",
	job_title: "relation",
	media_types: "relation",
	organization_name: "text",
	organization_createdAt: "date",
	organization_updatedAt: "date",
	status: "enum",
	priority: "enum",
	tags: "relation",
	description: "text",
	salutation: "relation",
	title: "relation",
	function: "text",
	sources: "relation",
	lists: "relation",
	journeys: "relation",
	journey_steps: "relation",
	journey_finished: "relation",
	surveys: "relation",
	survey_items_question: "relation",
	survey_items_answer: "relation",
	event_title: "text",
	event_action: "relation",
	event_status: "text",
	event_composition: "relation",
	event_composition_sent_status: "enum",
	event_channel: "relation",
	donation_transactions_from: "date",
	donation_transactions_amount: "number",
	donation_transactions_campaign_name: "text",
	donation_transactions_status: "text",
	donation_subscriptions_from: "date",
	donation_subscriptions_amount: "number",
	donation_subscriptions_interval: "text",
	action_normalized_type: "relation",
	action_source: "text",
	action_value: "text",
	action_external_id: "text",
	action_partnership: "text",
	industry: "relation",
	job_description: "text",
	duration_role: "number",
	connection_degree: "text",
	organization: "relation",
};

export const RELATION_META: Record<
	string,
	{
		serviceName: ServiceName;
		labelKey: string;
		filterKey?: string;
		filter?: string;
		deduplicateByLabel?: boolean;
	}
> = {
	contact_types: {
		serviceName: "contactTypesService",
		labelKey: "AdvancedFilters.fields.contact_types",
	},
	contact_interests: {
		serviceName: "contactInterestsService",
		labelKey: "AdvancedFilters.fields.contact_interests",
	},
	subscriptions: {
		serviceName: "channelsService",
		labelKey: "AdvancedFilters.fields.subscriptions",
		filter: "channel",
	},
	ranks: {
		serviceName: "contactRanksService",
		labelKey: "AdvancedFilters.fields.rank",
	},
	department: {
		serviceName: "departmentsService",
		labelKey: "AdvancedFilters.fields.department",
	},
	job_title: {
		serviceName: "contactJobTitlesService",
		labelKey: "AdvancedFilters.fields.job_title",
	},
	media_types: {
		serviceName: "mediaTypesService",
		labelKey: "AdvancedFilters.fields.media_type",
	},
	organization: {
		serviceName: "organizationsService",
		labelKey: "AdvancedFilters.fields.organization",
	},
	industry: {
		serviceName: "industriesService",
		labelKey: "AdvancedFilters.fields.industry",
	},
	sources: {
		serviceName: "sourcesService",
		labelKey: "AdvancedFilters.fields.source",
	},
	lists: {
		serviceName: "listsService",
		labelKey: "AdvancedFilters.fields.lists",
	},
	journeys: {
		serviceName: "journeysService",
		labelKey: "AdvancedFilters.fields.journeys",
	},
	journey_steps: {
		serviceName: "journeyStepsService",
		labelKey: "AdvancedFilters.fields.journey_steps",
	},
	surveys: {
		serviceName: "surveysService",
		labelKey: "AdvancedFilters.fields.surveys",
		filterKey: "name",
	},
	survey_items_question: {
		serviceName: "surveyItemsService",
		labelKey: "AdvancedFilters.fields.survey_items_question",
		filterKey: "question",
		deduplicateByLabel: true,
	},
	survey_items_answer: {
		serviceName: "surveyItemsService",
		labelKey: "AdvancedFilters.fields.survey_items_answer",
		filterKey: "answer",
		deduplicateByLabel: true,
	},
	event_action: {
		serviceName: "eventsService",
		labelKey: "AdvancedFilters.fields.event",
		filterKey: "action",
		deduplicateByLabel: true,
	},
	event_composition: {
		serviceName: "compositionsService",
		labelKey: "AdvancedFilters.fields.event_composition",
		filterKey: "name",
	},
	event_channel: {
		serviceName: "channelsService",
		labelKey: "AdvancedFilters.fields.event_channel",
		filterKey: "name",
	},
	action_normalized_type: {
		serviceName: "actionTypeService",
		labelKey: "AdvancedFilters.fields.action_normalized_type",
	},
	tags: {
		labelKey: "AdvancedFilters.fields.tags",
		serviceName: "tagsService",
	},
	salutation: {
		serviceName: "contactSalutationsService",
		labelKey: "AdvancedFilters.fields.salutation",
	},
	title: {
		serviceName: "contactTitlesService",
		labelKey: "AdvancedFilters.fields.title",
	},
};

// Available filter fields organized by category
export const FILTER_CATEGORIES = {
	personal: {
		label: "Personal Information",
		fields: ["first_name", "last_name", "birth_date", "gender", "email"],
	},
	contact: {
		label: "Contact Information",
		fields: [
			"phone",
			"mobile_phone",
			"address_line1",
			"address_line2",
			"location",
			"canton",
			"zip",
			"country",
		],
	},
	social: {
		label: "Social Media",
		fields: ["linkedin_url", "facebook_url", "twitter_url"],
	},
	preferences: {
		label: "Preferences",
		fields: [
			"language",
			"language_free_form",
			"contact_types",
			"contact_interests",
			"subscriptions",
			"ranks",
			"salutation",
			"title",
		],
	},
	organization: {
		label: "Professional and Org",
		fields: [
			"department",
			"job_title",
			"media_types",
			"organization",
			"organization_name",
			"organization_createdAt",
			"organization_updatedAt",
			"industry",
			"job_description",
			"duration_role",
			"connection_degree",
		],
	},
	journeys: {
		label: "Journeys",
		fields: ["journeys", "journey_steps"],
	},
	surveys: {
		label: "Survey Responses",
		fields: ["surveys", "survey_items_question", "survey_items_answer"],
	},
	events: {
		label: "Events",
		fields: [
			"event_title",
			"event_action",
			"event_status",
			"event_composition",
			"event_composition_sent_status",
			"event_channel",
		],
	},
	donations: {
		label: "Donations",
		fields: [
			"donation_subscriptions_from",
			"donation_subscriptions_amount",
			"donation_subscriptions_interval",
			"donation_transactions_from",
			"donation_transactions_amount",
			"donation_transactions_campaign_name",
			"donation_transactions_status",
		],
	},
	actions: {
		label: "Actions",
		fields: [
			"action_normalized_type",
			"action_source",
			"action_value",
			"action_external_id",
			"action_partnership",
		],
	},
	other: {
		label: "Other",
		fields: [
			"status",
			"priority",
			"tags",
			"description",
			"function",
			"sources",
			"lists",
		],
	},
};
