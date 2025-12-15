import type { FilterConfig } from "@/lib/filters/filter-config-generator";

export const contactsFilterConfig: FilterConfig = {
	fieldTypes: {
		// Personal Information
		first_name: "text",
		last_name: "text",
		birth_date: "date",
		gender: "enum",
		email: "text",
		phone: "text",
		mobile_phone: "text",

		// Address Information
		address_line1: "text",
		address_line2: "text",
		location: "text",
		canton: "text",
		zip: "number",
		country: "text",

		// Social Media
		linkedin_url: "text",
		facebook_url: "text",
		twitter_url: "text",

		// Preferences
		language: "enum",
		language_free_form: "text",
		contact_types: "relation",
		contact_interests: "relation",
		subscriptions: "relation",
		ranks: "relation",
		salutation: "relation",
		title: "relation",

		// Professional
		department: "relation",
		job_title: "relation",
		media_types: "relation",
		organization: "relation",
		organization_name: "text",
		organization_createdAt: "date",
		organization_updatedAt: "date",
		industry: "relation",
		job_description: "text",
		duration_role: "number",
		connection_degree: "text",
		function: "text",

		// Journeys
		journeys: "relation",
		journey_steps: "relation",

		// Surveys
		surveys: "relation",
		survey_items_question: "relation",
		survey_items_answer: "relation",

		// Events
		event_title: "text",
		event_action: "relation",
		event_status: "text",
		event_composition: "relation",
		event_channel: "relation",

		// Donations
		donation_subscriptions_from: "date",
		donation_subscriptions_amount: "number",
		donation_subscriptions_interval: "text",
		donation_transactions_from: "date",
		donation_transactions_amount: "number",
		donation_transactions_campaign_name: "text",
		donation_transactions_status: "text",

		// Actions
		action_normalized_type: "relation",
		action_source: "text",
		action_value: "text",
		action_external_id: "text",
		action_partnership: "text",

		// Other
		status: "enum",
		priority: "enum",
		tags: "relation",
		description: "text",
		sources: "relation",
		lists: "relation",
	},

	fieldConfigs: {
		first_name: { name: "first_name", type: "text", label: "First Name" },
		last_name: { name: "last_name", type: "text", label: "Last Name" },
		birth_date: { name: "birth_date", type: "date", label: "Birth Date" },
		gender: {
			name: "gender",
			type: "enum",
			label: "Gender",
			enumValues: ["male", "female", "other"],
			hasOperator: false,
		},
		email: { name: "email", type: "text", label: "Email" },
		phone: { name: "phone", type: "text", label: "Phone" },
		mobile_phone: { name: "mobile_phone", type: "text", label: "Mobile Phone" },
		address_line1: {
			name: "address_line1",
			type: "text",
			label: "Address Line 1",
		},
		address_line2: {
			name: "address_line2",
			type: "text",
			label: "Address Line 2",
		},
		location: { name: "location", type: "text", label: "Location" },
		canton: { name: "canton", type: "text", label: "Canton" },
		zip: { name: "zip", type: "number", label: "ZIP" },
		country: { name: "country", type: "text", label: "Country" },
		linkedin_url: {
			name: "linkedin_url",
			type: "text",
			label: "LinkedIn URL",
		},
		facebook_url: {
			name: "facebook_url",
			type: "text",
			label: "Facebook URL",
		},
		twitter_url: {
			name: "twitter_url",
			type: "text",
			label: "Twitter (X) URL",
		},
		language: {
			name: "language",
			type: "enum",
			label: "Language",
			enumValues: ["en", "de", "fr", "it"],
			hasOperator: false,
		},
		language_free_form: {
			name: "language_free_form",
			type: "text",
			label: "Language (Free Form)",
		},
		contact_types: {
			name: "contact_types",
			type: "relation",
			label: "Contact Types",
			serviceName: "contactTypesService",
		},
		contact_interests: {
			name: "contact_interests",
			type: "relation",
			label: "Contact Interests",
			serviceName: "contactInterestsService",
		},
		subscriptions: {
			name: "subscriptions",
			type: "relation",
			label: "Subscriptions",
			serviceName: "channelsService",
		},
		ranks: {
			name: "ranks",
			type: "relation",
			label: "Ranks",
			serviceName: "contactRanksService",
		},
		salutation: {
			name: "salutation",
			type: "relation",
			label: "Salutation",
			serviceName: "contactSalutationsService",
		},
		title: {
			name: "title",
			type: "relation",
			label: "Title",
			serviceName: "contactTitlesService",
		},
		department: {
			name: "department",
			type: "relation",
			label: "Department",
			serviceName: "departmentsService",
		},
		job_title: {
			name: "job_title",
			type: "relation",
			label: "Job Title",
			serviceName: "contactJobTitlesService",
		},
		media_types: {
			name: "media_types",
			type: "relation",
			label: "Media Types",
			serviceName: "mediaTypesService",
		},
		organization: {
			name: "organization",
			type: "relation",
			label: "Organization",
			serviceName: "organizationsService",
		},
		organization_name: {
			name: "organization_name",
			type: "text",
			label: "Organization Name",
		},
		organization_createdAt: {
			name: "organization_createdAt",
			type: "date",
			label: "Organization Created At",
		},
		organization_updatedAt: {
			name: "organization_updatedAt",
			type: "date",
			label: "Organization Updated At",
		},
		industry: {
			name: "industry",
			type: "relation",
			label: "Industry",
			serviceName: "industriesService",
		},
		job_description: {
			name: "job_description",
			type: "text",
			label: "Job Description",
		},
		duration_role: {
			name: "duration_role",
			type: "number",
			label: "Duration in Role (years)",
		},
		connection_degree: {
			name: "connection_degree",
			type: "text",
			label: "Connection Degree",
		},
		function: { name: "function", type: "text", label: "Function" },
		journeys: {
			name: "journeys",
			type: "relation",
			label: "Journeys",
			serviceName: "journeysService",
		},
		journey_steps: {
			name: "journey_steps",
			type: "relation",
			label: "Journey Steps",
			serviceName: "journeyStepsService",
		},
		surveys: {
			name: "surveys",
			type: "relation",
			label: "Surveys",
			serviceName: "surveysService",
			filterKey: "name",
		},
		survey_items_question: {
			name: "survey_items_question",
			type: "relation",
			label: "Survey Items Question",
			serviceName: "surveyItemsService",
			filterKey: "question",
		},
		survey_items_answer: {
			name: "survey_items_answer",
			type: "relation",
			label: "Survey Items Answer",
			serviceName: "surveyItemsService",
			filterKey: "answer",
		},
		event_title: {
			name: "event_title",
			type: "text",
			label: "Event Title",
		},
		event_action: {
			name: "event_action",
			type: "relation",
			label: "Event Action",
			serviceName: "eventsService",
			filterKey: "action",
		},
		event_status: {
			name: "event_status",
			type: "text",
			label: "Event Status",
		},
		event_composition: {
			name: "event_composition",
			type: "relation",
			label: "Event Composition",
			serviceName: "compositionsService",
			filterKey: "name",
		},
		event_channel: {
			name: "event_channel",
			type: "relation",
			label: "Event Channel",
			serviceName: "channelsService",
			filterKey: "name",
		},
		donation_subscriptions_from: {
			name: "donation_subscriptions_from",
			type: "date",
			label: "Donation Subscriptions From",
		},
		donation_subscriptions_amount: {
			name: "donation_subscriptions_amount",
			type: "number",
			label: "Donation Subscriptions Amount",
		},
		donation_subscriptions_interval: {
			name: "donation_subscriptions_interval",
			type: "text",
			label: "Donation Subscriptions Interval",
		},
		donation_transactions_from: {
			name: "donation_transactions_from",
			type: "date",
			label: "Donation Transactions From",
		},
		donation_transactions_amount: {
			name: "donation_transactions_amount",
			type: "number",
			label: "Donation Transactions Amount",
		},
		donation_transactions_campaign_name: {
			name: "donation_transactions_campaign_name",
			type: "text",
			label: "Donation Transactions Campaign Name",
		},
		donation_transactions_status: {
			name: "donation_transactions_status",
			type: "text",
			label: "Donation Transactions Status",
		},
		action_normalized_type: {
			name: "action_normalized_type",
			type: "relation",
			label: "Action Normalized Type",
			serviceName: "actionTypeService",
		},
		action_source: {
			name: "action_source",
			type: "text",
			label: "Action Source",
		},
		action_value: {
			name: "action_value",
			type: "text",
			label: "Action Value",
		},
		action_external_id: {
			name: "action_external_id",
			type: "text",
			label: "Action External ID",
		},
		action_partnership: {
			name: "action_partnership",
			type: "text",
			label: "Action Partnership",
		},
		status: {
			name: "status",
			type: "enum",
			label: "Status",
			enumValues: ["active", "inactive", "pending"],
			hasOperator: false,
		},
		priority: {
			name: "priority",
			type: "enum",
			label: "Priority",
			enumValues: ["low", "medium", "high"],
			hasOperator: false,
		},
		tags: {
			name: "tags",
			type: "relation",
			label: "Tags",
			serviceName: "tagsService",
		},
		description: {
			name: "description",
			type: "text",
			label: "Description",
		},
		sources: {
			name: "sources",
			type: "relation",
			label: "Sources",
			serviceName: "sourcesService",
		},
		lists: {
			name: "lists",
			type: "relation",
			label: "Lists",
			serviceName: "listsService",
		},
	},

	categories: {
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
	},

	relationMeta: {
		contact_types: {
			serviceName: "contactTypeService",
			labelKey: "AdvancedFilters.fields.contact_types",
		},
		contact_interests: {
			serviceName: "contactInterestsService",
			labelKey: "AdvancedFilters.fields.contact_interests",
		},
		subscriptions: {
			serviceName: "channelService",
			labelKey: "AdvancedFilters.fields.subscriptions",
			filter: "channel",
		},
		ranks: {
			serviceName: "rankService",
			labelKey: "AdvancedFilters.fields.rank",
		},
		department: {
			serviceName: "departmentService",
			labelKey: "AdvancedFilters.fields.department",
		},
		job_title: {
			serviceName: "jobTitleService",
			labelKey: "AdvancedFilters.fields.job_title",
		},
		media_types: {
			serviceName: "mediaTypeService",
			labelKey: "AdvancedFilters.fields.media_type",
		},
		organization: {
			serviceName: "organizationService",
			labelKey: "AdvancedFilters.fields.organization",
		},
		industry: {
			serviceName: "industryService",
			labelKey: "AdvancedFilters.fields.industry",
		},
		sources: {
			serviceName: "sourceService",
			labelKey: "AdvancedFilters.fields.source",
		},
		lists: {
			serviceName: "listService",
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
		},
		survey_items_answer: {
			serviceName: "surveyItemsService",
			labelKey: "AdvancedFilters.fields.survey_items_answer",
			filterKey: "answer",
		},
		event_action: {
			serviceName: "eventsService",
			labelKey: "AdvancedFilters.fields.event",
			filterKey: "action",
		},
		event_composition: {
			serviceName: "compositionService",
			labelKey: "AdvancedFilters.fields.event_composition",
			filterKey: "name",
		},
		event_channel: {
			serviceName: "channelService",
			labelKey: "AdvancedFilters.fields.event_channel",
			filterKey: "name",
		},
		action_normalized_type: {
			serviceName: "actionTypeService",
			labelKey: "AdvancedFilters.fields.action_normalized_type",
		},
		tags: {
			labelKey: "AdvancedFilters.fields.tags",
			serviceName: "tagService",
		},
		salutation: {
			serviceName: "contactSalutationsService",
			labelKey: "AdvancedFilters.fields.salutation",
		},
		title: {
			serviceName: "contactTitlesService",
			labelKey: "AdvancedFilters.fields.title",
		},
	},
};
