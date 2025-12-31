import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

// Schema for SNS subscription confirmation
export const SNSConfirmationSchema = z.object({
	Type: z.literal("SubscriptionConfirmation"),
	MessageId: z.string(),
	Token: z.string(),
	TopicArn: z.string(),
	Message: z.string(),
	SubscribeURL: z.string().url(),
	Timestamp: z.string().datetime(),
	SignatureVersion: z.string(),
	Signature: z.string(),
	SigningCertURL: z.string().url(),
});

// Schema for SNS notification
export const SNSNotificationSchema = z.object({
	Type: z.literal("Notification"),
	MessageId: z.string(),
	TopicArn: z.string(),
	Subject: z.string().optional(),
	Message: z.string(), // This will contain the SES message
	Timestamp: z.string().datetime(),
	SignatureVersion: z.string(),
	Signature: z.string(),
	SigningCertURL: z.string().url(),
	UnsubscribeURL: z.string().url().optional(),
});

// Combined schema for all SNS message types
export const SNSMessageSchema = z.discriminatedUnion("Type", [
	SNSConfirmationSchema,
	SNSNotificationSchema,
]);

// Schema for SES message embedded in SNS notification
export const SESMessageSchema = z.object({
	eventType: z.string(),
	mail: z.object({
		timestamp: z.string(),
		messageId: z.string(),
		source: z.string().email(),
		destination: z.array(z.string().email()),
		headers: z
			.array(
				z.object({
					name: z.string(),
					value: z.string(),
				}),
			)
			.optional(),
		tags: z
			.record(z.array(z.string()))
			.optional()
			.describe("X-SES-MESSAGE-TAGS из Configuration Set"),
		// Add other fields as needed
	}),
	// Fields for different notification types (bounce, complaint, delivery)
	bounce: z
		.object({
			bounceType: z.string(),
			bounceSubType: z.string(),
			// Add other bounce fields as needed
		})
		.optional(),
	complaint: z
		.object({
			// Add complaint fields as needed
		})
		.optional(),
	delivery: z
		.object({
			timestamp: z.string(),
			recipients: z.array(z.string()).optional(),
			// Add other delivery fields as needed
		})
		.optional(),
});

// Schema for the processed record to be sent to Strapi
export const EmailRecordSchema = z.object({
	messageId: z.string(),
	timestamp: z.string(),
	source: z.string().email(),
	destination: z.string().email(),
	status: z.string(),
	// Add additional fields for Strapi
	composition_id: z.string().optional(),
	main_composition_id: z.string().optional(),
	channel: z.string().optional(),
	action: z.string().optional(),
	payload: z.string().optional(),
	external_id: z.string().optional(),
	delivery_timestamp: z.string().optional(),
});

export type SNSMessage = z.infer<typeof SNSMessageSchema>;
export type SESMessage = z.infer<typeof SESMessageSchema>;
export type EmailRecord = z.infer<typeof EmailRecordSchema>;
