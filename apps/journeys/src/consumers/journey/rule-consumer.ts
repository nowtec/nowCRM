import { JOURNEY_QUEUES } from "../../config";
import { logger } from "../../logger";
import { getChannel } from "../../rabbitmq";
import { processRuleMessage } from "./processors/rule-processor";

export function ruleConsumer() {
	getChannel().consume(
		JOURNEY_QUEUES.RULE_CHECK,
		async (msg) => {
			if (!msg) return;
			try {
				const data = JSON.parse(msg.content.toString());
				await processRuleMessage(data);
				getChannel().ack(msg);
			} catch (error) {
				logger.error(`Error processing rule message: ${error}`);
				getChannel().nack(msg, false, false);
			}
		},
		{ noAck: false },
	);
}
