import { JOURNEY_QUEUES } from "../../config";
import { logger } from "../../logger";
import { getChannel } from "../../rabbitmq";
import { processJobMessage } from "./processors/job-processor";

export function jobConsumer() {
	getChannel().consume(
		JOURNEY_QUEUES.JOB,
		async (msg) => {
			if (!msg) return;
			try {
				const data = JSON.parse(msg.content.toString());
				await processJobMessage(data);
				getChannel().ack(msg);
			} catch (error) {
				logger.error(`Error processing job message: ${error}`);
				getChannel().nack(msg, false, false);
			}
		},
		{ noAck: false },
	);
}
