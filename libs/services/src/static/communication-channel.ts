export enum CommunicationChannel {
	EMAIL = "Email",
	SMS = "SMS",
	LINKEDIN = "LinkedIn",
	WHATSAPP = "WhatsApp",
	TELEGRAM = "Telegram",
	TWITTER = "Twitter",
	UNIPILE = "Unipile",
	LINKEDIN_INVTITATIONS = "Linkedin_Invitations",
	// LINKEDIN_MESSAGING = "Linkedin_Messaging",
	BLOG = "Blog",
}

export type CommunicationChannelKeys =
	| "Email"
	| "SMS"
	| "LinkedIn"
	| "WhatsApp"
	| "Telegram"
	| "Unipile"
	| "Linkedin_Invitations"
	// | "Linkedin_Messaging"
	| "Blog";
