export const API_ROUTES_COMPOSER = {
	// composer
	CREATE_COMPOSITION: "composer/create-composition",
	CREATE_REFERENCE: "composer/create-reference",
	COMPOSER_REGENERATE: "composer/regenerate",
	COMPOSER_QUICK_WRITE: "composer/quick-write",
	COMPOSER_STRUCTURED_RESPONSE: "composer/structured-response",
	// ses webhook
	SES_WEBHOOK: "composer/webhook",
	//send to channels
	HEALTH_CHECK: "composer/health-check",
	SEND_TO_CHANNELS: "composer/send-to-channels",
	//linkedin
	CALLBACK_LINKEDIN: "composer/send-to-channels/callback/linkedin",
	CALLBACK_URL_LINKEDIN: "composer/send-to-channels/get-callback/linkedin",
	// twitter
	CALLBACK_URL_TWITTER: "composer/send-to-channels/get-callback/twitter",
	CALLBACK_TWITTER: "composer/send-to-channels/callback/twitter",
	// unipile
	CALLBACK_URL_UNIPILE: "composer/send-to-channels/get-callback/unipile",
	CALLBACK_UNIPILE: "composer/send-to-channels/callback/unipile",
	CALLBACK_STATUS_UNIPILE: "composer/send-to-channels/callback/status-unipile",
};
