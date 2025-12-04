import { JOURNEY_QUEUES } from "../../config";
import { logger } from "../../logger";
import { getChannel } from "../../rabbitmq";
import { processDelayedMessage } from "./processors/delayed-processor";

export function delayedConsumer() {
	const channel = getChannel();
	logger.info(`Starting delayed consumer for queue: ${JOURNEY_QUEUES.DELAYED}`);
	
	channel.consume(
		JOURNEY_QUEUES.DELAYED,
		async (msg) => {
			if (!msg) return;
			
			const startTime = Date.now();
			try {
				const data = JSON.parse(msg.content.toString());
				await processDelayedMessage(data);
				channel.ack(msg);
				
				const duration = Date.now() - startTime;
				logger.debug(
					{ duration, queue: JOURNEY_QUEUES.DELAYED, jobId: data.jobId },
					"Delayed message processed successfully",
				);
			} catch (error) {
				const duration = Date.now() - startTime;
				logger.error(
					{ err: error, duration, queue: JOURNEY_QUEUES.DELAYED },
					"Error processing delayed message",
				);
				// Nack without requeue to send to DLX
				channel.nack(msg, false, false);
			}
		},
		{ noAck: false },
	);
}
