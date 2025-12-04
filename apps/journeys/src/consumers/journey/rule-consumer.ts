import { JOURNEY_QUEUES } from "../../config";
import { logger } from "../../logger";
import { getChannel } from "../../rabbitmq";
import { processRuleMessage } from "./processors/rule-processor";

export function ruleConsumer() {
	const channel = getChannel();
	logger.info(`Starting rule consumer for queue: ${JOURNEY_QUEUES.RULE_CHECK}`);
	
	channel.consume(
		JOURNEY_QUEUES.RULE_CHECK,
		async (msg) => {
			if (!msg) return;
			
			const startTime = Date.now();
			try {
				const data = JSON.parse(msg.content.toString());
				await processRuleMessage(data);
				channel.ack(msg);
				
				const duration = Date.now() - startTime;
				logger.debug(
					{ duration, queue: JOURNEY_QUEUES.RULE_CHECK, jobId: data.jobId },
					"Rule message processed successfully",
				);
			} catch (error) {
				const duration = Date.now() - startTime;
				logger.error(
					{ err: error, duration, queue: JOURNEY_QUEUES.RULE_CHECK },
					"Error processing rule message",
				);
				// Nack without requeue to send to DLX
				channel.nack(msg, false, false);
			}
		},
		{ noAck: false },
	);
}
