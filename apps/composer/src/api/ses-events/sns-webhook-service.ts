import {
	type DocumentId,
	type Form_Contact,
	type Form_Event,
	ServiceResponse,
} from "@nowcrm/services";
import {
	contactsService,
	eventsService,
	subscriptionsService,
} from "@nowcrm/services/server";
import { StatusCodes } from "http-status-codes";
import { env } from "@/common/utils/env-config";
import { logger } from "@/server";
import type { EmailRecord, SESMessage, SNSMessage } from "./sns-webhook-model";

export class SNSWebhookServiceApi {
	private readonly receivedByEventType = new Map<string, number>();

	private nextEventTypeCount(eventType: string): number {
		const next = (this.receivedByEventType.get(eventType) ?? 0) + 1;
		this.receivedByEventType.set(eventType, next);
		return next;
	}

	/**
	 * Process an incoming SNS message
	 */
	async processSNSMessage(
		snsMessage: SNSMessage,
	): Promise<ServiceResponse<{ message: string } | null>> {
		try {
			logger.info(`Processing SNS message of type: ${snsMessage.Type}`);

			// Check if this is a subscription confirmation
			if (snsMessage.Type === "SubscriptionConfirmation") {
				logger.info(
					`Processing subscription confirmation with URL: ${snsMessage.SubscribeURL}`,
				);
				return await this.confirmSubscription(snsMessage.SubscribeURL);
			}

			// Process notification message
			if (snsMessage.Type === "Notification") {
				logger.info(
					`Processing notification with MessageId: ${snsMessage.MessageId}`,
				);
				logger.info(
					`Notification Message content: ${snsMessage.Message.substring(0, 200)}...`,
				);
				return await this.processNotification(snsMessage);
			}

			// If we get here, it's an unsupported message type
			logger.warn(`Unsupported SNS message type: ${snsMessage}`);
			return ServiceResponse.failure(
				"Unsupported SNS message type",
				null,
				StatusCodes.BAD_REQUEST,
			);
		} catch (error: any) {
			logger.error(`Error processing SNS message: ${error.message}`);
			logger.error(`Error stack: ${error.stack}`);
			return ServiceResponse.failure(
				`Failed to process SNS message: ${error.message}`,
				null,
				StatusCodes.INTERNAL_SERVER_ERROR,
			);
		}
	}

	/**
	 * Confirm an SNS subscription by sending a GET request to the SubscribeURL
	 */
	private async confirmSubscription(
		subscribeUrl: string,
	): Promise<ServiceResponse<{ message: string } | null>> {
		try {
			logger.info(`Confirming SNS subscription: ${subscribeUrl}`);

			// Send GET request to the SubscribeURL to confirm subscription
			const response = await fetch(subscribeUrl);
			logger.info(
				`Subscription confirmation response status: ${response.status}`,
			);

			const responseData = await response.json();
			logger.info(
				`Subscription confirmation response data: ${JSON.stringify(responseData)}`,
			);

			if (response.ok) {
				logger.info("SNS subscription confirmed successfully");
				return ServiceResponse.success(
					"SNS subscription confirmed successfully",
					{ message: "Subscription confirmed" },
				);
			} else {
				logger.error(
					`Failed to confirm SNS subscription: ${response.statusText}`,
				);
				return ServiceResponse.failure(
					`Failed to confirm SNS subscription: ${response.statusText}`,
					null,
					StatusCodes.BAD_GATEWAY,
				);
			}
		} catch (error: any) {
			logger.error(`Error confirming SNS subscription: ${error.message}`);
			logger.error(`Error stack: ${error.stack}`);
			return ServiceResponse.failure(
				`Error confirming SNS subscription: ${error.message}`,
				null,
				StatusCodes.INTERNAL_SERVER_ERROR,
			);
		}
	}

	/**
	 * Process an SNS notification containing SES message(s)
	 */
	private async processNotification(
		notification: SNSMessage & { Type: "Notification" },
	): Promise<ServiceResponse<{ message: string } | null>> {
		try {
			logger.info(`SNS notification received: id=${notification.MessageId}`);

			// Parse the SES message from the SNS notification
			let sesMessage: SESMessage;
			try {
				sesMessage = JSON.parse(notification.Message) as SESMessage;
				const eventTypeCount = this.nextEventTypeCount(sesMessage.eventType);
				logger.info(
					`SES event received: type=${sesMessage.eventType} n=${eventTypeCount} from=${sesMessage.mail.source} recipients=${sesMessage.mail.destination.length}`,
				);
			} catch (parseError) {
				logger.error(
					`SES parse failed: notificationId=${notification.MessageId} reason=${parseError}`,
				);
				throw new Error(`Failed to parse SES message: ${parseError}`);
			}

			// Extract email records from the SES message
			const emailRecords = this.extractEmailRecords(sesMessage, notification);
			logger.info(`SES records extracted: count=${emailRecords.length}`);

			// If no records match our domain filter, return early
			if (emailRecords.length === 0) {
				logger.info(
					`SES event skipped: type=${sesMessage.eventType} from=${sesMessage.mail.source} reason=domain_filter`,
				);
				return ServiceResponse.success("No matching records to process", {
					message: "Source domain filter applied, no matching records",
				});
			}

			// Process each email record
			const results = await Promise.all(
				emailRecords.map((record) => this.sendToStrapi(record)),
			);

			// Check if all records were processed successfully
			const allSuccessful = results.every((result) => result.success);
			const successCount = results.filter((result) => result.success).length;
			logger.info(
				`SES event processed: type=${sesMessage.eventType} ok=${successCount} fail=${results.length - successCount}`,
			);

			if (allSuccessful) {
				return ServiceResponse.success(
					"All email records processed successfully",
					{
						message: `Processed ${results.length} email records with contact connections`,
					},
				);
			} else {
				// Count failures
				const failureCount = results.filter((result) => !result.success).length;
				logger.warn(
					`Failed to process ${failureCount} out of ${results.length} email records`,
				);

				return ServiceResponse.failure(
					`Failed to process ${failureCount} out of ${results.length} email records`,
					{
						message: `Processed ${results.length - failureCount} email records successfully`,
					},
					StatusCodes.PARTIAL_CONTENT,
				);
			}
		} catch (error: any) {
			logger.error(`SNS notification failed: reason=${error.message}`);
			return ServiceResponse.failure(
				`Error processing SNS notification: ${error.message}`,
				null,
				StatusCodes.INTERNAL_SERVER_ERROR,
			);
		}
	}

	/**
	 * Extract individual email records from an SES message
	 */
	private extractEmailRecords(
		sesMessage: SESMessage,
		notification: SNSMessage & { Type: "Notification" },
	): EmailRecord[] {
		const records: EmailRecord[] = [];

		let compositionId: string | undefined;
		let mainCompositionId: string | undefined;
		let channel: string | undefined;

		if (sesMessage.mail.tags?.composition_id) {
			compositionId = sesMessage.mail.tags.composition_id[0];
		} else if (sesMessage.mail.headers) {
			const compHeader = sesMessage.mail.headers.find(
				(h) => h.name.toLowerCase() === "x-composition-id",
			);
			if (compHeader) {
				compositionId = compHeader.value;
			}
		}

		if (sesMessage.mail.tags?.main_composition_id) {
			mainCompositionId = sesMessage.mail.tags.main_composition_id[0];
		} else if (sesMessage.mail.headers) {
			const mainCompHeader = sesMessage.mail.headers.find(
				(h) => h.name.toLowerCase() === "x-main-composition-id",
			);
			if (mainCompHeader) {
				mainCompositionId = mainCompHeader.value;
			}
		}

		if (sesMessage.mail.tags?.composition_channel) {
			channel = sesMessage.mail.tags.composition_channel[0];
		} else if (sesMessage.mail.tags?.channel) {
			channel = sesMessage.mail.tags.channel[0];
		} else if (sesMessage.mail.headers) {
			const chHeader = sesMessage.mail.headers.find(
				(h) =>
					h.name.toLowerCase() === "x-composition-channel-id" ||
					h.name.toLowerCase() === "x-composition-channel" ||
					h.name.toLowerCase() === "channel",
			);
			if (chHeader) {
				channel = chHeader.value;
			}
		}

		// Helper function to extract domain from email
		const extractDomain = (email: string): string => {
			const parts = email.split("@");
			return parts.length > 1 ? parts[1].toLowerCase() : "";
		};

		// Get source domain
		const sourceDomain = extractDomain(sesMessage.mail.source);

		// Parse COMPOSER_CUSTOMER_IDENTITY into an array of allowed domains
		const allowedDomains = (env.COMPOSER_CUSTOMER_IDENTITY || "")
			.split(",")
			.map((d) => d.trim().toLowerCase())
			.filter(Boolean);

		// Check if the source domain is in the allowed list
		if (allowedDomains.length > 0 && !allowedDomains.includes(sourceDomain)) {
			logger.info(
				`SES domain skip: fromDomain=${sourceDomain} allowed=${allowedDomains.join(",")}`,
			);
			return records;
		}

		// For each destination email, create a separate record
		for (const destination of sesMessage.mail.destination) {
			let status = "delivered";

			// Determine status based on notification type
			if (sesMessage.bounce) {
				status = "bounced";
			} else if (sesMessage.complaint) {
				status = "complained";
			}

			// Get the status from headers if available
			let headerStatus = status;
			if (sesMessage.mail.headers && sesMessage.mail.headers.length > 0) {
				headerStatus = sesMessage.mail.headers[0].name;
			}

			const record: EmailRecord = {
				messageId: sesMessage.mail.messageId,
				timestamp: sesMessage.mail.timestamp,
				source: sesMessage.mail.source,
				destination: destination,
				composition_id: compositionId,
				main_composition_id: mainCompositionId,
				channel,
				status: headerStatus,
				action:
					sesMessage.eventType === "Bounce" && sesMessage.bounce
						? `${sesMessage.bounce.bounceType} ${sesMessage.eventType}`
						: sesMessage.eventType,
				payload: JSON.stringify(notification),
				external_id: sesMessage.mail.messageId,
				delivery_timestamp:
					sesMessage.delivery?.timestamp || sesMessage.mail.timestamp,
			};
			records.push(record);
		}

		return records;
	}

	/**
	 * Send an email record to Strapi
	 */
	private async sendToStrapi(
		record: EmailRecord,
	): Promise<ServiceResponse<null>> {
		try {
			logger.info(
				`Event write start: type=${record.status || "unknown"} action=${record.action || "unknown"} to=${record.destination} from=${record.source}`,
			);

			// First, find the contact ID by email
			let contactId: DocumentId | undefined;
			try {
				// Use contactsService to find contact by email
				const contactResponse = await contactsService.find(
					env.COMPOSER_STRAPI_API_TOKEN,
					{
						filters: {
							email: {
								$eq: record.destination,
							},
						},
					},
				);

				if (
					contactResponse.success &&
					contactResponse.data &&
					contactResponse.data.length > 0
				) {
					contactId = contactResponse.data[0].documentId;
				} else {
					logger.info(`Contact missing, creating: email=${record.destination}`);

					// Create the contact if it doesn't exist
					const createContactResult = await this.createContactFromEmail(
						record.destination,
					);
					if (createContactResult.success) {
						// Fetch the newly created contact to get its ID
						const newContactResponse = await contactsService.find(
							env.COMPOSER_STRAPI_API_TOKEN,
							{
								filters: {
									email: {
										$eq: record.destination,
									},
								},
							},
						);

						if (
							newContactResponse.success &&
							newContactResponse.data &&
							newContactResponse.data.length > 0
						) {
							contactId = newContactResponse.data[0].documentId;
						} else {
							logger.warn(
								`Contact created but lookup failed: email=${record.destination}`,
							);
						}
					} else {
						logger.warn(
							`Contact create failed: email=${record.destination} reason=${createContactResult.message}`,
						);
					}
				}
			} catch (error: any) {
				logger.warn(
					`Contact resolve failed: email=${record.destination} reason=${error.message}`,
				);
				// Continue without contact ID if there's an error
			}

			// Create a new event entry with contact relation
			const eventData: Partial<Form_Event> = {
				action: record.action || "email_sent",
				payload: record.payload || "",
				source: record.source,
				channel: record.channel,
				composition: record.main_composition_id,
				composition_item: record.composition_id,
				external_id: record.external_id,
				event_status: record.status,
				destination: record.destination,
			};

			// Add contact relation if we found a contact ID
			if (contactId) {
				eventData.contact = contactId;
			}

			// Use eventsService to create the event
			const response = await eventsService.create(
				eventData as Form_Event,
				env.COMPOSER_STRAPI_API_TOKEN,
			);

			if (response.success) {
				logger.info(
					`Event saved: type=${record.status || "unknown"} action=${record.action || "unknown"} to=${record.destination} from=${record.source}`,
				);
				if (record.action?.includes("Permanent Bounce")) {
					await eventsService.create(
						{
							contact: contactId,
							composition: record.main_composition_id,
							composition_item: record.composition_id,
							external_id: "",
							destination: record.destination,
							event_status: "unsubscribed",
							action: "unsubscribe",
							source: "Unsubscribe",
							channel: record.channel,
							publishedAt: new Date(),
							title: "Unsubscribe event",
						},
						env.COMPOSER_STRAPI_API_TOKEN,
					);

					if (contactId) {
						try {
							const contactResponse = await contactsService.find(
								env.COMPOSER_STRAPI_API_TOKEN,
								{
									filters: { documentId: { $eq: contactId } },
									populate: ["subscriptions", "subscriptions.channel"],
								},
							);

							if (
								contactResponse.success &&
								Array.isArray(contactResponse.data) &&
								contactResponse.data.length > 0
							) {
								const contact = contactResponse.data[0];

								const emailSub = contact.subscriptions?.find(
									(s: any) =>
										s.channel?.name === "Email" ||
										s.channel?.documentId === record.channel,
								);

								if (!emailSub) {
									logger.info(
										`No Email subscription found for contact ${contactId}`,
									);
									return ServiceResponse.success(
										`No Email subscription found for contact ${contactId}`,
										null,
									);
								}

								if (emailSub.active === false) {
									logger.info(
										`Email subscription already inactive for contact ${contactId}`,
									);
									return ServiceResponse.success(
										`Email subscription already inactive for contact ${contactId}`,
										null,
									);
								}

								await subscriptionsService.update(
									emailSub.documentId,
									{ active: false },
									env.COMPOSER_STRAPI_API_TOKEN,
								);

								logger.info(
									`Email subscription ${emailSub.documentId} deactivated for contact ${contactId}`,
								);

								return ServiceResponse.success(
									`Email subscription ${emailSub.documentId} deactivated for contact ${contactId}`,
									null,
								);
							}
						} catch (err) {
							const msg = err instanceof Error ? err.message : String(err);
							logger.warn(
								`Failed to deactivate Email subscription for contact ${contactId}: ${msg}`,
							);
							return ServiceResponse.failure(
								`Failed to deactivate Email subscription for contact ${contactId}: ${msg}`,
								null,
							);
						}
					}
				}

				return ServiceResponse.success(
					`Event created for ${record.destination}`,
					null,
				);
			}

			logger.error(
				`Event save failed: type=${record.status || "unknown"} action=${record.action || "unknown"} to=${record.destination} from=${record.source} reason=${response.errorMessage || "Unknown error"}`,
			);
			return ServiceResponse.failure(
				`Failed to create email record in Strapi for ${record.destination}: ${response.errorMessage || "Unknown error"}`,
				null,
				StatusCodes.BAD_GATEWAY,
			);
		} catch (error: any) {
			logger.error(
				`Event save error: type=${record.status || "unknown"} action=${record.action || "unknown"} to=${record.destination} from=${record.source} reason=${error.message}`,
			);
			return ServiceResponse.failure(
				`Error sending to Strapi: ${error.message}`,
				null,
				StatusCodes.INTERNAL_SERVER_ERROR,
			);
		}
	}

	/**
	 * Create a contact in Strapi from an email address
	 */
	async createContactFromEmail(email: string): Promise<ServiceResponse<null>> {
		try {
			logger.info(`Creating contact from email: ${email}`);

			// Check if contact already exists using contactsService
			const checkResponse = await contactsService.find(
				env.COMPOSER_STRAPI_API_TOKEN,
				{
					filters: {
						email: {
							$eq: email,
						},
					},
				},
			);

			// If contact already exists, return success
			if (
				checkResponse.success &&
				checkResponse.data &&
				checkResponse.data.length > 0
			) {
				logger.info(`Contact already exists for email: ${email}`);
				return ServiceResponse.success(
					`Contact already exists for email: ${email}`,
					null,
				);
			}

			// Create a new contact using contactsService with only the email field
			// Using Partial<Form_Contact> to make all fields optional
			const contactData: Partial<Form_Contact> = {
				email: email,
				// publishedAt: new Date()  ,
			};

			// Cast to Form_Contact when passing to the service
			const response = await contactsService.create(
				contactData,
				env.COMPOSER_STRAPI_API_TOKEN,
			);

			if (response.success) {
				logger.info(`Contact created: email=${email}`);
				return ServiceResponse.success(
					`Contact created in Strapi for ${email}`,
					null,
				);
			} else {
				logger.error(
					`Contact create failed: email=${email} reason=${response.errorMessage || "Unknown error"}`,
				);
				return ServiceResponse.failure(
					`Failed to create contact in Strapi for ${email}: ${response.errorMessage || "Unknown error"}`,
					null,
					StatusCodes.BAD_GATEWAY,
				);
			}
		} catch (error: any) {
			logger.error(
				`Contact create error: email=${email} reason=${error.message}`,
			);
			return ServiceResponse.failure(
				`Error creating contact from email: ${error.message}`,
				null,
				StatusCodes.INTERNAL_SERVER_ERROR,
			);
		}
	}
}

export const snsWebhookServiceApi = new SNSWebhookServiceApi();
