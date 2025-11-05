import * as amqp from "amqplib";
import {
	EXCHANGE_NAME_JOURNEY,
	EXCHANGE_NAME_TRIGGER,
	EXCHANGE_TYPE,
	JOURNEY_QUEUES,
	RABBITMQ_URL,
	TRIGGER_QUEUES,
} from "../config";
import { logger } from "../logger";

let channel: amqp.Channel;

export async function setupRabbitMQ() {
	const connection = await amqp.connect(RABBITMQ_URL);
	channel = await connection.createChannel();

	//
	// 1) JOURNEY EXCHANGE + QUEUES
	//
	await channel.assertExchange(EXCHANGE_NAME_JOURNEY, EXCHANGE_TYPE, {
		durable: true,
		autoDelete: false,
		arguments: { "x-delayed-type": "direct" },
	});

	for (const queue of Object.values(JOURNEY_QUEUES)) {
		// main queue
		await channel.assertQueue(queue, {
			durable: true,
			deadLetterExchange: "",
			deadLetterRoutingKey: `${queue}_DLX`,
		});
		// dead‑letter
		await channel.assertQueue(`${queue}_DLX`, { durable: true });
		// bind
		await channel.bindQueue(queue, EXCHANGE_NAME_JOURNEY, queue);
	}

	//
	// 2) TRIGGER EXCHANGE + QUEUES
	//
	await channel.assertExchange(EXCHANGE_NAME_TRIGGER, EXCHANGE_TYPE, {
		durable: true,
		autoDelete: false,
		arguments: { "x-delayed-type": "direct" },
	});

	for (const queue of Object.values(TRIGGER_QUEUES)) {
		await channel.assertQueue(queue, {
			durable: true,
			deadLetterExchange: "",
			deadLetterRoutingKey: `${queue}_DLX`,
		});
		await channel.assertQueue(`${queue}_DLX`, { durable: true });
		await channel.bindQueue(queue, EXCHANGE_NAME_TRIGGER, queue);
	}

	logger.info("RabbitMQ connected and all queues initialized");
}

export function publishToJourneyQueue(
	queue: keyof typeof JOURNEY_QUEUES,
	data: any,
	delayMs = 0,
) {
	channel.publish(
		EXCHANGE_NAME_JOURNEY,
		JOURNEY_QUEUES[queue],
		Buffer.from(JSON.stringify(data)),
		{
			persistent: true,
			headers: { "x-delay": delayMs },
			messageId: data.jobKey, // for avoiding deduplicates
		},
	);
}

export function publishToTriggerQueue(
	queue: keyof typeof TRIGGER_QUEUES,
	data: any,
	delayMs = 0,
) {
	channel.publish(
		EXCHANGE_NAME_TRIGGER,
		TRIGGER_QUEUES[queue],
		Buffer.from(JSON.stringify(data)),
		{
			persistent: true,
			headers: { "x-delay": delayMs },
		},
	);
}

export function getChannel() {
	if (!channel) {
		throw new Error("RabbitMQ channel not initialized");
	}
	return channel;
}
