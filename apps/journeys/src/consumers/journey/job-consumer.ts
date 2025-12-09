import { JOURNEY_QUEUES } from "../../config";
import { handleMessageRetry } from "../../lib/functions/helpers/retry-handler";
import { logger } from "../../logger";
import { getChannel } from "../../rabbitmq";
import { processJobMessage } from "./processors/job-processor";

export function jobConsumer() {
	const channel = getChannel();
	logger.info(`Starting job consumer for queue: ${JOURNEY_QUEUES.JOB}`);

	// Handle channel errors to prevent unacked messages from accumulating
	channel.on("error", (err) => {
		logger.error({ err }, "Job consumer channel error");
	});

	channel.on("close", () => {
		logger.warn(
			"Job consumer channel closed - unacked messages will be requeued",
		);
	});

	channel.consume(
		JOURNEY_QUEUES.JOB,
		async (msg) => {
			if (!msg) return;

			const startTime = Date.now();
			let data: any;
			try {
				data = JSON.parse(msg.content.toString());
				await processJobMessage(data);

				// Ack message after successful processing
				try {
					channel.ack(msg);
					const duration = Date.now() - startTime;
					logger.info(
						{ duration, queue: JOURNEY_QUEUES.JOB, jobId: data.jobId },
						"Job message processed and acked successfully",
					);
				} catch (ackError) {
					logger.error(
						{
							err: ackError,
							queue: JOURNEY_QUEUES.JOB,
							jobId: data.jobId,
						},
						"Failed to ack job message after successful processing",
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
				try {
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
						try {
							channel.ack(msg);
							logger.info(
								{
									queue: JOURNEY_QUEUES.JOB,
									jobId: data.jobId,
								},
								"Acked original message after republishing for retry",
							);
						} catch (ackError) {
							logger.error(
								{
									err: ackError,
									queue: JOURNEY_QUEUES.JOB,
									jobId: data.jobId,
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
							logger.info(
								{
									queue: JOURNEY_QUEUES.JOB,
									jobId: data.jobId,
								},
								"Nacked message to DLX (max retries exceeded or non-retryable error)",
							);
						} catch (nackError) {
							logger.error(
								{
									err: nackError,
									queue: JOURNEY_QUEUES.JOB,
									jobId: data.jobId,
								},
								"Failed to nack message to DLX",
							);
						}
					}
				} catch (retryError) {
					// If retry handler itself fails, send to DLX to prevent infinite loops
					logger.error(
						{ err: retryError, queue: JOURNEY_QUEUES.JOB, jobId: data.jobId },
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
