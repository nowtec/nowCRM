import { JOURNEY_QUEUES } from "../../config";
import { handleMessageRetry } from "../../lib/functions/helpers/retry-handler";
import { logger } from "../../logger";
import { getChannel } from "../../rabbitmq";
import { processRuleMessage } from "./processors/rule-processor";

export function ruleConsumer() {
	const channel = getChannel();
	logger.info(`Starting rule consumer for queue: ${JOURNEY_QUEUES.RULE_CHECK}`);

	// Handle channel errors to prevent unacked messages from accumulating
	channel.on("error", (err) => {
		logger.error({ err }, "Rule consumer channel error");
	});

	channel.on("close", () => {
		logger.warn(
			"Rule consumer channel closed - unacked messages will be requeued",
		);
	});

	channel.consume(
		JOURNEY_QUEUES.RULE_CHECK,
		async (msg) => {
			if (!msg) return;

			const startTime = Date.now();
			let data: any;
			let messageAcked = false;
			try {
				data = JSON.parse(msg.content.toString());
				await processRuleMessage(data);

				// Ack message after successful processing
				channel.ack(msg);
				messageAcked = true;
				const duration = Date.now() - startTime;
				logger.info(
					{ duration, queue: JOURNEY_QUEUES.RULE_CHECK, jobId: data.jobId },
					"Rule message processed and acked successfully",
				);
			} catch (error) {
				const duration = Date.now() - startTime;
				const err = error instanceof Error ? error : new Error(String(error));

				logger.error(
					{ err, duration, queue: JOURNEY_QUEUES.RULE_CHECK },
					"Error processing rule message",
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
						"RULE_CHECK",
						JOURNEY_QUEUES.RULE_CHECK,
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
								queue: JOURNEY_QUEUES.RULE_CHECK,
								jobId: data.jobId,
							},
							"Acked original message after republishing for retry",
						);
					} else {
						// Max retries exceeded or non-retryable error, send to DLX
						channel.nack(msg, false, false);
						messageAcked = true; // Mark as handled (nacked to DLX)
						logger.info(
							{
								queue: JOURNEY_QUEUES.RULE_CHECK,
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
							queue: JOURNEY_QUEUES.RULE_CHECK,
							jobId: data.jobId,
						},
						"Failed to handle message retry, sending to DLX",
					);
					channel.nack(msg, false, false);
					messageAcked = true; // Mark as handled (nacked to DLX)
				}
			} finally {
				// Safety net: Ensure message is always acked/nacked to prevent unacked messages
				if (!messageAcked && msg) {
					logger.warn(
						{
							queue: JOURNEY_QUEUES.RULE_CHECK,
							jobId: data?.jobId,
						},
						"Message was not acked/nacked in normal flow, attempting safety ack",
					);
					try {
						channel.ack(msg);
						logger.info(
							{
								queue: JOURNEY_QUEUES.RULE_CHECK,
								jobId: data?.jobId,
							},
							"Successfully acked message in finally block (safety net)",
						);
					} catch (finalAckError) {
						logger.error(
							{
								err: finalAckError,
								queue: JOURNEY_QUEUES.RULE_CHECK,
								jobId: data?.jobId,
							},
							"Failed to ack message in finally block, attempting nack to DLX",
						);
						try {
							channel.nack(msg, false, false);
							logger.info(
								{
									queue: JOURNEY_QUEUES.RULE_CHECK,
									jobId: data?.jobId,
								},
								"Successfully nacked message to DLX in finally block",
							);
						} catch (finalNackError) {
							logger.error(
								{
									err: finalNackError,
									queue: JOURNEY_QUEUES.RULE_CHECK,
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
}
