import { JOURNEY_QUEUES } from "../../config";
import { logger } from "../../logger";
import { getChannel } from "../../rabbitmq";
import { processJobMessage } from "./processors/job-processor";

export function jobConsumer() {
	const channel = getChannel();
	logger.info(`Starting job consumer for queue: ${JOURNEY_QUEUES.JOB}`);
	
	channel.consume(
		JOURNEY_QUEUES.JOB,
		async (msg) => {
			if (!msg) return;
			
			const startTime = Date.now();
			try {
				const data = JSON.parse(msg.content.toString());
				await processJobMessage(data);
				channel.ack(msg);
				
				const duration = Date.now() - startTime;
				logger.debug(
					{ duration, queue: JOURNEY_QUEUES.JOB, jobId: data.jobId },
					"Job message processed successfully",
				);
			} catch (error) {
				const duration = Date.now() - startTime;
				logger.error(
					{ err: error, duration, queue: JOURNEY_QUEUES.JOB },
					"Error processing job message",
				);
				// Nack without requeue to send to DLX
				channel.nack(msg, false, false);
			}
		},
		{ noAck: false },
	);
}
