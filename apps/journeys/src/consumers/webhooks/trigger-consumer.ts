import { TRIGGER_QUEUES } from "../../config";
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
			
			const startTime = Date.now();
			try {
				const data = JSON.parse(msg.content.toString());
				await processTriggerMessage(data);
				channel.ack(msg);
				
				const duration = Date.now() - startTime;
				logger.debug(
					{ duration, queue: TRIGGER_QUEUES.TRIGGER },
					"Trigger message processed successfully",
				);
			} catch (error) {
				const duration = Date.now() - startTime;
				logger.error(
					{ err: error, duration, queue: TRIGGER_QUEUES.TRIGGER },
					"Error processing trigger message",
				);
				// Nack without requeue to send to DLX
				channel.nack(msg, false, false);
			}
		},
		{ noAck: false },
	);
}
