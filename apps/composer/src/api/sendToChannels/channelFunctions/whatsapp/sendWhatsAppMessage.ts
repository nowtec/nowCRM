import {
	CommunicationChannel,
	type CompositionItem,
	type Contact,
	ServiceResponse,
} from "@nowcrm/services";
import {
	settingCredentialsService,
	settingsService,
} from "@nowcrm/services/server";
import { StatusCodes } from "http-status-codes";
import { env } from "@/common/utils/envConfig";
import { logEvent } from "../utils/logEvent";
import { checkMentions, replaceMentionsInText } from "../utils/Mentions";

export async function sendMessage(
	contact: Contact,
	composition: CompositionItem,
): Promise<ServiceResponse<string | null>> {
	// Retrieve settings (this part is unchanged)
	const settings = await settingsService.find(env.COMPOSER_STRAPI_API_TOKEN, {
		populate: "*",
	});

	if (!settings.success || !settings.data) {
		return ServiceResponse.failure(
			"Setting not found, probably Strapi is down",
			null,
			StatusCodes.INTERNAL_SERVER_ERROR,
		);
	}
	if (settings.data[0].subscription === "verify") {
		if (contact.subscriptions.length === 0) {
			return ServiceResponse.failure(
				"Contact has no subscription",
				null,
				StatusCodes.BAD_REQUEST,
			);
		}

		const whatsappSubscription = contact.subscriptions?.find((item) =>
			item.channel.name
				.toLowerCase()
				.includes(CommunicationChannel.WHATSAPP.toLowerCase()),
		);

		if (!whatsappSubscription) {
			return ServiceResponse.failure(
				"Contact has no subscription",
				null,
				StatusCodes.BAD_REQUEST,
			);
		}

		if (!whatsappSubscription.active) {
			return ServiceResponse.failure(
				"Contact has subscription, but it is not active",
				null,
				StatusCodes.BAD_REQUEST,
			);
		}
	}

	if (settings.data[0].setting_credentials.length === 0) {
		return ServiceResponse.failure(
			"Strapi token badly configured for Composer service",
			null,
			StatusCodes.PARTIAL_CONTENT,
		);
	}
	// Find WhatsApp credentials from settings
	const whatsapp_credential = settings.data[0].setting_credentials.find(
		(item) =>
			item.name.toLowerCase() === CommunicationChannel.WHATSAPP.toLowerCase(),
	);
	// Determine the recipient's phone number.
	const phoneNumber = contact.mobile_phone
		? contact.mobile_phone
		: contact.phone;
	if (!phoneNumber) {
		return ServiceResponse.failure(
			"No phone number available for contact",
			null,
			StatusCodes.BAD_REQUEST,
		);
	}
	if (!whatsapp_credential) {
		return ServiceResponse.failure(
			"No whatsapp credentials found for your account",
			null,
			StatusCodes.INTERNAL_SERVER_ERROR,
		);
	}
	if (!whatsapp_credential.access_token) {
		await settingCredentialsService.update(
			whatsapp_credential.documentId,
			{
				credential_status: "invalid",
				error_message:
					"No whatsapp access token provided, please refresh your token",
			},
			env.COMPOSER_STRAPI_API_TOKEN,
		);
		return ServiceResponse.failure(
			"No whatsapp access token provided, please refresh your token",
			null,
			StatusCodes.BAD_REQUEST,
		);
	}

	// Prepare URL for the WhatsApp API message endpoint
	const url = `https://graph.facebook.com/v22.0/${whatsapp_credential.client_id}/messages`;

	// Convert attached files (if any) into an array with filename and path.
	const attachments =
		composition.attached_files?.map((file) => ({
			filename: file.name,
			path: file.url,
		})) || [];

	// Helper function: Returns media type based on file extension.
	function getMediaType(
		filename: string,
	): "image" | "video" | "document" | "audio" {
		const ext = filename.split(".").pop()?.toLowerCase();
		if (!ext) return "document";
		if (["jpg", "jpeg", "png", "gif"].includes(ext)) return "image";
		if (["mp4", "avi", "mov"].includes(ext)) return "video";
		if (["mp3", "ogg", "wav"].includes(ext)) return "audio";
		if (["pdf", "doc", "docx", "ppt", "pptx"].includes(ext)) return "document";
		return "document";
	}

	// Helper function: Sends a payload to WhatsApp using fetch.
	async function sendPayload(payload: any): Promise<any> {
		const post = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${(whatsapp_credential as any).access_token}`,
			},
			body: JSON.stringify(payload),
		});
		return await post.json();
	}

	// Will accumulate IDs from sent messages
	const messageIds: string[] = [];

	try {
		// If there are attachments, handle them differently.
		if (attachments.length > 0) {
			// If more than one attachment and text exists,
			// send a separate text message first.
			if (
				attachments.length > 1 &&
				composition.result &&
				composition.result.trim() !== ""
			) {
				const textPayload = {
					messaging_product: "whatsapp",
					recipient_type: "individual",
					to: phoneNumber,
					type: "text",
					text: {
						preview_url: false,
						body: composition.result,
					},
				};
				const textResponse = await sendPayload(textPayload);
				if (textResponse?.messages?.[0]?.id) {
					messageIds.push(textResponse.messages[0].id);
				} else if (textResponse?.error?.message) {
					return ServiceResponse.failure(
						`${textResponse.error.message} - ${textResponse.error.type}. Code: ${textResponse.error.code}`,
						null,
						textResponse.error.code,
					);
				}
			}

			// Loop through each attachment and send it as a media message.
			for (const file of attachments) {
				const mediaType = getMediaType(file.filename);
				const mediaPayload: any = {
					messaging_product: "whatsapp",
					recipient_type: "individual",
					to: phoneNumber,
					type: mediaType,
				};

				// Decide if we should include the text as caption.
				// If there is only one attachment and text exists, include it as a caption.
				const includeCaption =
					attachments.length === 1 &&
					composition.result &&
					composition.result.trim() !== "";

				if (mediaType === "image") {
					mediaPayload.image = { link: file.path };
					if (includeCaption) {
						mediaPayload.image.caption = composition.result;
					}
				} else if (mediaType === "video") {
					mediaPayload.video = { link: file.path };
					if (includeCaption) {
						mediaPayload.video.caption = composition.result;
					}
				} else if (mediaType === "document") {
					mediaPayload.document = {
						link: file.path,
						filename: file.filename,
					};
					// Caption support for documents depends on WhatsApp API limitations.
					if (includeCaption) {
						mediaPayload.document.caption = composition.result;
					}
				} else if (mediaType === "audio") {
					mediaPayload.audio = { link: file.path };
				}

				const mediaResponse = await sendPayload(mediaPayload);
				if (mediaResponse?.messages?.[0]?.id) {
					messageIds.push(mediaResponse.messages[0].id);
				} else if (mediaResponse?.error?.message) {
					return ServiceResponse.failure(
						`${mediaResponse.error.message} - ${mediaResponse.error.type}. Code: ${mediaResponse.error.code}`,
						null,
						mediaResponse.error.code,
					);
				}
			}

			// Return aggregated message IDs as a JSON string.
			return ServiceResponse.success(
				"Whatsapp message(s) sent",
				JSON.stringify(messageIds),
				StatusCodes.OK,
			);
		} else {
			// No attachments: proceed with the original text message payload.
			const payload = {
				messaging_product: "whatsapp",
				recipient_type: "individual",
				to: phoneNumber,
				type: "text",
				text: {
					preview_url: false,
					body: composition.result,
				},
			};

			const response = await sendPayload(payload);
			if (response?.messages?.[0]?.id) {
				return ServiceResponse.success(
					"Whatsapp message sent",
					response.messages[0].id,
					StatusCodes.OK,
				);
			}
			if (response?.error?.message) {
				return ServiceResponse.failure(
					`${response.error.message} - ${response.error.type}. Code: ${response.error.code}`,
					null,
					response.error.code,
				);
			}

			return ServiceResponse.success(
				"Whatsapp message sent",
				"",
				StatusCodes.OK,
			);
		}
	} catch (error) {
		// Handle any unexpected errors during the process.
		return ServiceResponse.failure(
			`Unexpected error during sending: ${error}`,
			null,
			StatusCodes.INTERNAL_SERVER_ERROR,
		);
	}
}

export async function whatsAppMessage(
	composition: CompositionItem,
	contact: Contact,
): Promise<ServiceResponse<boolean>> {
	// Initialize formated_text with the original composition text.
	let formated_text: string = composition.result || "";

	// Extract and replace mentions in formated_text, leaving composition.result unchanged.
	const { mentions } = await checkMentions(formated_text);
	formated_text = await replaceMentionsInText(formated_text, contact, mentions);

	const compositionForEmail = { ...composition, result: formated_text };

	const messageId = await sendMessage(contact, compositionForEmail);

	if (!messageId.responseObject) {
		return ServiceResponse.failure(
			messageId.message,
			false,
			StatusCodes.INTERNAL_SERVER_ERROR,
		);
	}
	await logEvent(
		contact,
		composition.documentId,
		composition.channel.documentId,
		"WhatsApp",
		messageId.responseObject,
	);
	return ServiceResponse.success("Message sent", true, StatusCodes.OK);
}
