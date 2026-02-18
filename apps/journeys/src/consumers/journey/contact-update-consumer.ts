import { JOURNEY_QUEUES } from "../../config";
import { handleMessageRetry } from "../../lib/functions/helpers/retry-handler";
import { passContactToNextStep } from "../../lib/functions/pass-contact-to-next-step";
import { logger } from "../../logger";
import { getChannel } from "../../rabbitmq";

type ContactUpdateMessage = {
	contactId: string;
	currentStep: string;
	journeyId: string;
	nextStep: string | null;
};

export function contactUpdateConsumer() {
	const channel = getChannel();
	logger.info(
		`Starting contact update consumer for queue: ${JOURNEY_QUEUES.CONTACT_UPDATE}`,
	);

	// Handle channel errors to prevent unacked messages from accumulating
	channel.on("error", (err) => {
		logger.error({ err }, "Contact update consumer channel error");
	});

	channel.on("close", () => {
		logger.warn(
			"Contact update consumer channel closed - unacked messages will be requeued",
		);
	});

	channel.consume(
		JOURNEY_QUEUES.CONTACT_UPDATE,
		async (msg) => {
			if (!msg) return;

			const startTime = Date.now();
			let data: ContactUpdateMessage;
			try {
				data = JSON.parse(msg.content.toString());
			} catch (parseError) {
				logger.error(
					{ err: parseError },
					"Failed to parse contact update message",
				);
				channel.nack(msg, false, false);
				return;
			}

			try {
				await passContactToNextStep(
					data.contactId,
					data.currentStep,
					data.journeyId,
					data.nextStep,
				);

				// Ack message after successful processing
				try {
					channel.ack(msg);
					const duration = Date.now() - startTime;
					logger.debug(
						{
							duration,
							queue: JOURNEY_QUEUES.CONTACT_UPDATE,
							contactId: data.contactId,
							journeyId: data.journeyId,
						},
						"Contact update message processed and acked successfully",
					);
				} catch (ackError) {
					logger.error(
						{
							err: ackError,
							queue: JOURNEY_QUEUES.CONTACT_UPDATE,
							contactId: data.contactId,
						},
						"Failed to ack contact update message after successful processing",
					);
					// If ack fails, try nack to prevent message from being stuck
					try {
						channel.nack(msg, false, true); // Requeue message
					} catch (nackError) {
						logger.error(
							{ err: nackError },
							"Failed to nack message after ack failure",
						);
					}
				}
			} catch (error) {
				const duration = Date.now() - startTime;
				const err = error instanceof Error ? error : new Error(String(error));

				logger.error(
					{
						err,
						duration,
						queue: JOURNEY_QUEUES.CONTACT_UPDATE,
						contactId: data.contactId,
					},
					"Error processing contact update message",
				);

				// Try to retry with exponential backoff
				try {
					const wasRetried = await handleMessageRetry(
						true, // isJourneyQueue
						"CONTACT_UPDATE",
						JOURNEY_QUEUES.CONTACT_UPDATE,
						msg,
						data,
						err,
					);

					if (wasRetried) {
						// Message was requeued for retry, acknowledge original message
						try {
							channel.ack(msg);
							logger.debug(
								{
									queue: JOURNEY_QUEUES.CONTACT_UPDATE,
									contactId: data.contactId,
								},
								"Acked original message after republishing for retry",
							);
						} catch (ackError) {
							logger.error(
								{
									err: ackError,
									queue: JOURNEY_QUEUES.CONTACT_UPDATE,
									contactId: data.contactId,
								},
								"Failed to ack message after republishing for retry",
							);
							try {
								channel.nack(msg, false, true);
							} catch (nackError) {
								logger.error(
									{ err: nackError },
									"Failed to nack message after ack failure in retry handler",
								);
							}
						}
					} else {
						// Max retries exceeded or non-retryable error, send to DLX
						try {
							channel.nack(msg, false, false);
							logger.debug(
								{
									queue: JOURNEY_QUEUES.CONTACT_UPDATE,
									contactId: data.contactId,
								},
								"Nacked message to DLX (max retries exceeded or non-retryable error)",
							);
						} catch (nackError) {
							logger.error(
								{
									err: nackError,
									queue: JOURNEY_QUEUES.CONTACT_UPDATE,
									contactId: data.contactId,
								},
								"Failed to nack message to DLX",
							);
						}
					}
				} catch (retryError) {
					// If retry handler itself fails, send to DLX to prevent infinite loops
					logger.error(
						{
							err: retryError,
							queue: JOURNEY_QUEUES.CONTACT_UPDATE,
							contactId: data.contactId,
						},
						"Failed to handle message retry, sending to DLX",
					);
					try {
						channel.nack(msg, false, false);
					} catch (nackError) {
						logger.error(
							{ err: nackError },
							"Failed to nack message after retry handler failure",
						);
					}
				}
			}
		},
		{ noAck: false },
	);
}
