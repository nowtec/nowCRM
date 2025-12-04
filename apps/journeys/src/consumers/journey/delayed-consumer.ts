import { JOURNEY_QUEUES } from "../../config";
import { handleMessageRetry } from "../../lib/functions/helpers/retry-handler";
import { logger } from "../../logger";
import { getChannel } from "../../rabbitmq";
import { processDelayedMessage } from "./processors/delayed-processor";

export function delayedConsumer() {
	const channel = getChannel();
	logger.info(`Starting delayed consumer for queue: ${JOURNEY_QUEUES.DELAYED}`);

	channel.consume(
		JOURNEY_QUEUES.DELAYED,
		async (msg) => {
			if (!msg) {
				logger.warn("Received null message in delayed consumer");
				return;
			}

			const startTime = Date.now();
			let data: any;
			try {
				const messageContent = msg.content.toString();
				logger.debug(
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

				await processDelayedMessage(data);
				channel.ack(msg);

				const duration = Date.now() - startTime;
				logger.debug(
					{ duration, queue: JOURNEY_QUEUES.DELAYED, jobId: data.jobId },
					"Delayed message processed successfully",
				);
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
				} else {
					// Max retries exceeded or non-retryable error, send to DLX
					channel.nack(msg, false, false);
				}
			}
		},
		{ noAck: false },
	);
}
