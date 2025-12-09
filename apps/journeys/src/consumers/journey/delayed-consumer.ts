import { JOURNEY_QUEUES } from "../../config";
import { handleMessageRetry } from "../../lib/functions/helpers/retry-handler";
import { logger } from "../../logger";
import { getChannel } from "../../rabbitmq";
import { processDelayedMessage } from "./processors/delayed-processor";

export function delayedConsumer() {
	const channel = getChannel();
	logger.info(`Starting delayed consumer for queue: ${JOURNEY_QUEUES.DELAYED}`);

	// Handle channel errors to prevent unacked messages from accumulating
	channel.on("error", (err) => {
		logger.error({ err }, "Delayed consumer channel error");
	});

	channel.on("close", () => {
		logger.warn(
			"Delayed consumer channel closed - unacked messages will be requeued",
		);
	});

	channel.consume(
		JOURNEY_QUEUES.DELAYED,
		async (msg) => {
			if (!msg) {
				logger.warn("Received null message in delayed consumer");
				return;
			}

			const startTime = Date.now();
			let data: any;
			let messageAcked = false;
			try {
				const messageContent = msg.content.toString();
				logger.info(
					{
						queue: JOURNEY_QUEUES.DELAYED,
						messageSize: messageContent.length,
						headers: msg.properties?.headers,
					},
					"Received delayed message",
				);

				data = JSON.parse(messageContent);
				logger.info(
					{
						jobId: data.jobId,
						contactId: data.contactId,
						stepId: data.stepId,
						delay: msg.properties?.headers?.["x-delay"],
					},
					`Processing delayed job: ${data.jobId}`,
				);

				// Add timeout to prevent hanging forever
				const processPromise = processDelayedMessage(data);
				const timeoutPromise = new Promise((_, reject) => {
					setTimeout(
						() =>
							reject(
								new Error(
									`Timeout processing delayed job ${data.jobId} after 30 seconds`,
								),
							),
						30000,
					); // 30 second timeout
				});
				await Promise.race([processPromise, timeoutPromise]);

				// Ack message after successful processing
				// Use try-catch around ack to ensure we log if ack fails
				try {
					channel.ack(msg);
					messageAcked = true;
					const duration = Date.now() - startTime;
					logger.info(
						{ duration, queue: JOURNEY_QUEUES.DELAYED, jobId: data.jobId },
						"Delayed message processed and acked successfully",
					);
				} catch (ackErr) {
					logger.error(
						{
							err: ackErr,
							queue: JOURNEY_QUEUES.DELAYED,
							jobId: data.jobId,
						},
						"Failed to ack delayed message after successful processing",
					);
					// Try nack as fallback
					try {
						channel.nack(msg, false, true);
						messageAcked = true;
					} catch (nackErr) {
						logger.error(
							{ err: nackErr },
							"Failed to nack message after ack failure",
						);
					}
					// Re-throw to trigger error handling flow
					throw ackErr;
				}
			} catch (error) {
				const duration = Date.now() - startTime;
				const err = error instanceof Error ? error : new Error(String(error));

				logger.error(
					{ err, duration, queue: JOURNEY_QUEUES.DELAYED },
					"Error processing delayed message",
				);

				// Parse data if not already parsed
				if (!data) {
					try {
						data = JSON.parse(msg.content.toString());
					} catch (parseError) {
						logger.error(
							{ err: parseError },
							"Failed to parse message for retry",
						);
						channel.nack(msg, false, false);
						return;
					}
				}

				// Try to retry with exponential backoff
				try {
					const wasRetried = await handleMessageRetry(
						true, // isJourneyQueue
						"DELAYED",
						JOURNEY_QUEUES.DELAYED,
						msg,
						data,
						err,
					);

					if (wasRetried) {
						// Message was requeued for retry, acknowledge original message
						channel.ack(msg);
						messageAcked = true;
						logger.info(
							{
								queue: JOURNEY_QUEUES.DELAYED,
								jobId: data.jobId,
								retryCount:
									(data as any)._retryMetadata?.["x-retry-count"] || 0,
							},
							"Acked original message after republishing for retry",
						);
					} else {
						// Max retries exceeded or non-retryable error, send to DLX
						channel.nack(msg, false, false);
						messageAcked = true; // Mark as handled (nacked to DLX)
						logger.info(
							{
								queue: JOURNEY_QUEUES.DELAYED,
								jobId: data.jobId,
							},
							"Nacked message to DLX (max retries exceeded or non-retryable error)",
						);
					}
				} catch (retryError) {
					// If retry handler itself fails, send to DLX to prevent infinite loops
					logger.error(
						{
							err: retryError,
							queue: JOURNEY_QUEUES.DELAYED,
							jobId: data.jobId,
						},
						"Failed to handle message retry, sending to DLX",
					);
					channel.nack(msg, false, false);
					messageAcked = true; // Mark as handled (nacked to DLX)
				}
			} finally {
				// Safety net: Ensure message is always acked/nacked to prevent unacked messages
				// This handles edge cases where errors prevent normal ack/nack flow
				if (!messageAcked && msg) {
					logger.warn(
						{
							queue: JOURNEY_QUEUES.DELAYED,
							jobId: data?.jobId,
						},
						"Message was not acked/nacked in normal flow, attempting safety ack",
					);
					try {
						// Try to ack - if it fails, the message will be requeued by RabbitMQ
						channel.ack(msg);
						logger.info(
							{
								queue: JOURNEY_QUEUES.DELAYED,
								jobId: data?.jobId,
							},
							"Successfully acked message in finally block (safety net)",
						);
					} catch (finalAckError) {
						// If ack fails, try nack to DLX as last resort
						logger.error(
							{
								err: finalAckError,
								queue: JOURNEY_QUEUES.DELAYED,
								jobId: data?.jobId,
							},
							"Failed to ack message in finally block, attempting nack to DLX",
						);
						try {
							channel.nack(msg, false, false);
							logger.info(
								{
									queue: JOURNEY_QUEUES.DELAYED,
									jobId: data?.jobId,
								},
								"Successfully nacked message to DLX in finally block",
							);
						} catch (finalNackError) {
							logger.error(
								{
									err: finalNackError,
									queue: JOURNEY_QUEUES.DELAYED,
									jobId: data?.jobId,
								},
								"Failed to nack message in finally block - message may remain unacked",
							);
						}
					}
				}
			}
		},
		{ noAck: false },
	);

	// Handle consumer cancellation - when consumer is cancelled, unacked messages are automatically requeued
	channel.on("cancel", (consumerTag: string) => {
		logger.warn(
			{ consumerTag, queue: JOURNEY_QUEUES.DELAYED },
			"Delayed consumer was cancelled. Unacked messages will be automatically requeued by RabbitMQ.",
		);
	});
}
