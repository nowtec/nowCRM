import { TRIGGER_QUEUES } from "../../config";
import { handleMessageRetry } from "../../lib/functions/helpers/retry-handler";
import { logger } from "../../logger";
import { getChannel } from "../../rabbitmq";
import { processTriggerMessage } from "./processors/trigger-processor";

export function triggerConsumer() {
	const channel = getChannel();
	logger.info(`Starting trigger consumer for queue: ${TRIGGER_QUEUES.TRIGGER}`);

	channel.consume(
		TRIGGER_QUEUES.TRIGGER,
		async (msg) => {
			if (!msg) return;
			let data: any;
			const startTime = Date.now();
			try {
				data = JSON.parse(msg.content.toString());
				await processTriggerMessage(data);
				channel.ack(msg);

				const duration = Date.now() - startTime;
				logger.debug(
					{ duration, queue: TRIGGER_QUEUES.TRIGGER },
					"Trigger message processed successfully",
				);
			} catch (error) {
				const duration = Date.now() - startTime;
				const err = error instanceof Error ? error : new Error(String(error));

				logger.error(
					{ err, duration, queue: TRIGGER_QUEUES.TRIGGER },
					"Error processing trigger message",
				);

				// Try to retry with exponential backoff
				const wasRetried = await handleMessageRetry(
					false, // isJourneyQueue (trigger queue)
					"TRIGGER",
					TRIGGER_QUEUES.TRIGGER,
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
