import { JOURNEY_QUEUES } from "../../config";
import { logger } from "../../logger";
import { getChannel } from "../../rabbitmq";
import { processDelayedMessage } from "./processors/delayed-processor";

export function delayedConsumer() {
	getChannel().consume(
		JOURNEY_QUEUES.DELAYED,
		async (msg) => {
			if (!msg) return;
			try {
				const data = JSON.parse(msg.content.toString());
				await processDelayedMessage(data);
				getChannel().ack(msg);
			} catch (error) {
				logger.error(`Error processing delayed message: ${error}`);
				console.log(error);
				getChannel().nack(msg, false, false);
			}
		},
		{ noAck: false },
	);
}
