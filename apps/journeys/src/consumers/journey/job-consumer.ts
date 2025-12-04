import { JOURNEY_QUEUES } from "../../config";
import { handleMessageRetry } from "../../lib/functions/helpers/retry-handler";
import { logger } from "../../logger";
import { getChannel } from "../../rabbitmq";
import { processJobMessage } from "./processors/job-processor";

export function jobConsumer() {
	const channel = getChannel();
	logger.info(`Starting job consumer for queue: ${JOURNEY_QUEUES.JOB}`);

	channel.consume(
		JOURNEY_QUEUES.JOB,
		async (msg) => {
			if (!msg) return;

			const startTime = Date.now();
			let data: any;
			try {
				data = JSON.parse(msg.content.toString());
				await processJobMessage(data);
				channel.ack(msg);

				const duration = Date.now() - startTime;
				logger.debug(
					{ duration, queue: JOURNEY_QUEUES.JOB, jobId: data.jobId },
					"Job message processed successfully",
				);
			} catch (error) {
				const duration = Date.now() - startTime;
				const err = error instanceof Error ? error : new Error(String(error));

				logger.error(
					{ err, duration, queue: JOURNEY_QUEUES.JOB },
					"Error processing job message",
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
					"JOB",
					JOURNEY_QUEUES.JOB,
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
