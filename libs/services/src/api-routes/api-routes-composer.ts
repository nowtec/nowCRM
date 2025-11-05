export const API_ROUTES_COMPOSER = {
	// composer
	CREATE_COMPOSITION: "composer/create-composition",
	CREATE_REFERENCE: "composer/create-reference",
	COMPOSER_REGENERATE: "composer/regenerate",
	COMPOSER_QUICK_WRITE: "composer/quick-write",

	// ses webhook
	SES_WEBHOOK: "webhook/ses-event-to-strapi",

	//send to channels
	HEALTH_CHECK: "health-check",
	SEND_TO_CHANNELS: "send-to-channels",
	//linkedin
	CALLBACK_LINKEDIN: "callback/linkedin",
	CALLBACK_URL_LINKEDIN: "get-callback-linkedin",
	// twitter
	CALLBACK_URL_TWITTER: "get-callback-twitter",
	CALLBACK_TWITTER: "callback/twitter",
	// unipile
	CALLBACK_URL_UNIPILE: "get-callback-unipile",
	CALLBACK_UNIPILE: "callback/unipile",
	CALLBACK_STATUS_UNIPILE: "callback/status-unipile",
};
