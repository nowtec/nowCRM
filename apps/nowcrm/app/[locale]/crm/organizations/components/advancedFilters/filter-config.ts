import type { FilterConfig } from "@/lib/filters/filter-config-generator";

export const organizationsFilterConfig: FilterConfig = {
	fieldTypes: {
		// General Information
		name: "text",
		email: "text",
		url: "text",

		// Address Information
		address_line1: "text",
		contact_person: "text",
		location: "text",
		country: "text",
		zip: "number",
		canton: "text",

		// Social Media
		twitter_url: "text",
		facebook_url: "text",
		whatsapp_channel: "text",
		linkedin_url: "text",
		telegram_url: "text",
		telegram_channel: "text",
		instagram_url: "text",
		tiktok_url: "text",
		whatsapp_phone: "text",

		// Relations
		organization_type: "relation",
		industry: "relation",
		frequency: "relation",
		media_type: "relation",
		sources: "relation",

		// Other
		language: "enum",
		tag: "text",
		description: "text",
	},

	fieldConfigs: {
		name: { name: "name", type: "text", label: "Name" },
		email: { name: "email", type: "text", label: "Email" },
		url: { name: "url", type: "text", label: "Website URL" },
		address_line1: {
			name: "address_line1",
			type: "text",
			label: "Address Line 1",
		},
		contact_person: {
			name: "contact_person",
			type: "text",
			label: "Contact Person",
		},
		location: { name: "location", type: "text", label: "Location" },
		country: { name: "country", type: "text", label: "Country" },
		zip: { name: "zip", type: "number", label: "ZIP" },
		canton: { name: "canton", type: "text", label: "Canton" },
		twitter_url: {
			name: "twitter_url",
			type: "text",
			label: "Twitter (X) URL",
		},
		facebook_url: {
			name: "facebook_url",
			type: "text",
			label: "Facebook URL",
		},
		whatsapp_channel: {
			name: "whatsapp_channel",
			type: "text",
			label: "WhatsApp Channel",
		},
		linkedin_url: {
			name: "linkedin_url",
			type: "text",
			label: "LinkedIn URL",
		},
		telegram_url: {
			name: "telegram_url",
			type: "text",
			label: "Telegram URL",
		},
		telegram_channel: {
			name: "telegram_channel",
			type: "text",
			label: "Telegram Channel",
		},
		instagram_url: {
			name: "instagram_url",
			type: "text",
			label: "Instagram URL",
		},
		tiktok_url: { name: "tiktok_url", type: "text", label: "TikTok URL" },
		whatsapp_phone: {
			name: "whatsapp_phone",
			type: "text",
			label: "WhatsApp Phone",
		},
		organization_type: {
			name: "organization_type",
			type: "relation",
			label: "Organization Type",
			serviceName: "organizationTypesService",
		},
		industry: {
			name: "industry",
			type: "relation",
			label: "Industry",
			serviceName: "industriesService",
		},
		frequency: {
			name: "frequency",
			type: "relation",
			label: "Frequency",
			serviceName: "frequenciesService",
		},
		media_type: {
			name: "media_type",
			type: "relation",
			label: "Media Type",
			serviceName: "mediaTypesService",
		},
		sources: {
			name: "sources",
			type: "relation",
			label: "Sources",
			serviceName: "sourcesService",
		},
		language: {
			name: "language",
			type: "enum",
			label: "Language",
			enumValues: ["en", "de", "fr", "it"],
			hasOperator: false,
		},
		tag: { name: "tag", type: "text", label: "Tag" },
		description: {
			name: "description",
			type: "text",
			label: "Description",
		},
	},

	categories: {
		general: {
			label: "General Information",
			fields: ["name", "email", "url"],
		},
		address: {
			label: "Address Information",
			fields: [
				"address_line1",
				"contact_person",
				"location",
				"country",
				"zip",
				"canton",
			],
		},
		social: {
			label: "Social Media",
			fields: [
				"twitter_url",
				"facebook_url",
				"whatsapp_channel",
				"linkedin_url",
				"telegram_url",
				"telegram_channel",
				"instagram_url",
				"tiktok_url",
				"whatsapp_phone",
			],
		},
		organization: {
			label: "Organization Types and Industries",
			fields: ["organization_type", "industry"],
		},
		preferences: {
			label: "Preferences / Other",
			fields: [
				"frequency",
				"media_type",
				"language",
				"tag",
				"description",
				"sources",
			],
		},
	},

	relationMeta: {
		organization_type: {
			serviceName: "organizationTypesService",
			labelKey: "AdvancedFilters.fields.organization_type",
		},
		industry: {
			serviceName: "industriesService",
			labelKey: "AdvancedFilters.fields.industry",
		},
		frequency: {
			serviceName: "frequenciesService",
			labelKey: "AdvancedFilters.fields.frequency",
		},
		media_type: {
			serviceName: "mediaTypesService",
			labelKey: "AdvancedFilters.fields.media_type",
		},
		sources: {
			serviceName: "sourcesService",
			labelKey: "AdvancedFilters.fields.sources",
		},
	},
};

export const FIELD_CONFIGS: Record<
	string,
	{
		hasOperator?: boolean;
		multiValue?: boolean;
		multiValuePlaceholder?: string;
		enumValues?: string[];
	}
> = Object.fromEntries(
	Object.entries(organizationsFilterConfig.fieldConfigs).map(([key, config]) => [
		key,
		{
			hasOperator: (config as { hasOperator?: boolean }).hasOperator,
			multiValue:
				(config as { multiValue?: boolean }).multiValue ??
				["text", "number", "enum", "relation"].includes(
					(config as { type?: "text" | "number" | "date" | "relation" | "enum" })
						.type || "text",
				),
			multiValuePlaceholder: (config as { multiValuePlaceholder?: string })
				.multiValuePlaceholder,
			enumValues: (config as { enumValues?: string[] }).enumValues,
		},
	]),
);
