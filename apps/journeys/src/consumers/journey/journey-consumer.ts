import { JOURNEY_QUEUES } from "../../config";
import { logger } from "../../logger";
import { getChannel } from "../../rabbitmq";
import { processJourneyMessage } from "./processors/journey-processor";

export function journeyConsumer() {
	const channel = getChannel();
	logger.info(`Starting journey consumer for queue: ${JOURNEY_QUEUES.JOURNEY}`);
	
	channel.consume(
		JOURNEY_QUEUES.JOURNEY,
		async (msg) => {
			if (!msg) return;
			
			const startTime = Date.now();
			try {
				const data = JSON.parse(msg.content.toString());
				await processJourneyMessage(data);
				channel.ack(msg);
				
				const duration = Date.now() - startTime;
				logger.debug(
					{ duration, queue: JOURNEY_QUEUES.JOURNEY, journeyId: data.journeyId },
					"Journey message processed successfully",
				);
			} catch (error) {
				const duration = Date.now() - startTime;
				logger.error(
					{ err: error, duration, queue: JOURNEY_QUEUES.JOURNEY },
					"Error processing journey message",
				);
				// Nack without requeue to send to DLX
				channel.nack(msg, false, false);
			}
		},
		{ noAck: false },
	);
}
