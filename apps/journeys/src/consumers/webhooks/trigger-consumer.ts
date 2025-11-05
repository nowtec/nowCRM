import { TRIGGER_QUEUES } from "../../config";
import { logger } from "../../logger";
import { getChannel } from "../../rabbitmq";
import { processTriggerMessage } from "./processors/trigger-processor";

export function triggerConsumer() {
	getChannel().consume(
		TRIGGER_QUEUES.TRIGGER,
		async (msg) => {
			if (!msg) return;
			try {
				const data = JSON.parse(msg.content.toString());
				await processTriggerMessage(data);
				getChannel().ack(msg);
			} catch (error) {
				logger.error(`Error processing trigger message: ${error}`);
				getChannel().nack(msg, false, false);
			}
		},
		{ noAck: false },
	);
}
