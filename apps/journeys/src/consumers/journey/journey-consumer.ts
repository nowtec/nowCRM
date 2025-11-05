import { JOURNEY_QUEUES } from "../../config";
import { logger } from "../../logger";
import { getChannel } from "../../rabbitmq";
import { processJourneyMessage } from "./processors/journey-processor";

export function journeyConsumer() {
	getChannel().consume(
		JOURNEY_QUEUES.JOURNEY,
		async (msg) => {
			if (!msg) return;
			try {
				const data = JSON.parse(msg.content.toString());
				await processJourneyMessage(data);
				getChannel().ack(msg);
			} catch (error) {
				logger.error(`Error processing journey message: ${error}`);
				getChannel().nack(msg, false, false);
			}
		},
		{ noAck: false },
	);
}
