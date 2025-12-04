import * as amqp from "amqplib";
import {
	EXCHANGE_NAME_JOURNEY,
	EXCHANGE_NAME_TRIGGER,
	EXCHANGE_TYPE,
	JOURNEY_QUEUES,
	RABBITMQ_URL,
	TRIGGER_QUEUES,
} from "../config";
import { env } from "../common/utils/env-config";
import { logger } from "../logger";

let connection: amqp.Connection | null = null;
let channel: amqp.Channel | null = null;
let confirmChannel: amqp.ConfirmChannel | null = null;
let reconnectAttempts = 0;
let isReconnecting = false;
let reconnectTimer: NodeJS.Timeout | null = null;

/**
 * Sets up RabbitMQ exchanges and queues
 */
async function setupExchangesAndQueues(ch: amqp.Channel) {
	//
	// 1) JOURNEY EXCHANGE + QUEUES
	//
	await ch.assertExchange(EXCHANGE_NAME_JOURNEY, EXCHANGE_TYPE, {
		durable: true,
		autoDelete: false,
		arguments: { "x-delayed-type": "direct" },
	});

	for (const queue of Object.values(JOURNEY_QUEUES)) {
		// main queue
		await ch.assertQueue(queue, {
			durable: true,
			deadLetterExchange: "",
			deadLetterRoutingKey: `${queue}_DLX`,
		});
		// dead‑letter
		await ch.assertQueue(`${queue}_DLX`, { durable: true });
		// bind
		await ch.bindQueue(queue, EXCHANGE_NAME_JOURNEY, queue);
	}

	//
	// 2) TRIGGER EXCHANGE + QUEUES
	//
	await ch.assertExchange(EXCHANGE_NAME_TRIGGER, EXCHANGE_TYPE, {
		durable: true,
		autoDelete: false,
		arguments: { "x-delayed-type": "direct" },
	});

	for (const queue of Object.values(TRIGGER_QUEUES)) {
		await ch.assertQueue(queue, {
			durable: true,
			deadLetterExchange: "",
			deadLetterRoutingKey: `${queue}_DLX`,
		});
		await ch.assertQueue(`${queue}_DLX`, { durable: true });
		await ch.bindQueue(queue, EXCHANGE_NAME_TRIGGER, queue);
	}
}

/**
 * Sets up error handlers for connection and channels
 */
function setupErrorHandlers(conn: amqp.Connection, ch: amqp.Channel) {
	conn.on("error", (err) => {
		logger.error({ err }, "RabbitMQ connection error");
		if (!isReconnecting) {
			reconnect();
		}
	});

	conn.on("close", () => {
		logger.warn("RabbitMQ connection closed");
		if (!isReconnecting) {
			reconnect();
		}
	});

	ch.on("error", (err) => {
		logger.error({ err }, "RabbitMQ channel error");
		if (!isReconnecting) {
			reconnect();
		}
	});

	ch.on("close", () => {
		logger.warn("RabbitMQ channel closed");
		if (!isReconnecting) {
			reconnect();
		}
	});
}

/**
 * Reconnects to RabbitMQ with exponential backoff
 */
async function reconnect() {
	if (isReconnecting) {
		return;
	}

	isReconnecting = true;
	reconnectAttempts += 1;

	if (reconnectAttempts > env.RABBITMQ_MAX_RECONNECT_ATTEMPTS) {
		logger.error(
			`Max reconnection attempts (${env.RABBITMQ_MAX_RECONNECT_ATTEMPTS}) reached. Exiting.`,
		);
		process.exit(1);
	}

	const delay =
		env.RABBITMQ_RECONNECT_DELAY_MS *
		Math.min(Math.pow(2, reconnectAttempts - 1), 10);

	logger.info(
		`Attempting to reconnect to RabbitMQ (attempt ${reconnectAttempts}/${env.RABBITMQ_MAX_RECONNECT_ATTEMPTS}) in ${delay}ms...`,
	);

	// Clean up old connection
	if (channel) {
		try {
			await channel.close();
		} catch (err) {
			// Ignore errors during cleanup
		}
		channel = null;
	}

	if (confirmChannel) {
		try {
			await confirmChannel.close();
		} catch (err) {
			// Ignore errors during cleanup
		}
		confirmChannel = null;
	}

	if (connection) {
		try {
			// Connection.close() exists but type definitions may be incomplete
			await (connection as any).close();
		} catch (err) {
			// Ignore errors during cleanup
		}
		connection = null;
	}

	reconnectTimer = setTimeout(async () => {
		try {
			await setupRabbitMQ();
			reconnectAttempts = 0;
			isReconnecting = false;
			logger.info("Successfully reconnected to RabbitMQ");
		} catch (err) {
			logger.error({ err }, "Reconnection failed");
			isReconnecting = false;
			reconnect();
		}
	}, delay);
}

/**
 * Initializes RabbitMQ connection, channels, and queues
 */
export async function setupRabbitMQ() {
	try {
		// Type assertion needed due to incomplete type definitions
		const conn = (await amqp.connect(RABBITMQ_URL)) as unknown as amqp.Connection;
		connection = conn;
		
		const ch = (await (conn as any).createChannel()) as amqp.Channel;
		channel = ch;
		
		const confirmCh = (await (conn as any).createConfirmChannel()) as amqp.ConfirmChannel;
		confirmChannel = confirmCh;

		// Set prefetch limit to prevent overwhelming consumers
		const prefetchCount = env.RABBITMQ_PREFETCH_COUNT;
		await ch.prefetch(prefetchCount);
		await confirmCh.prefetch(prefetchCount);

		logger.info(
			`RabbitMQ prefetch count set to ${prefetchCount} messages per consumer`,
		);

		// Setup exchanges and queues
		await setupExchangesAndQueues(ch);

		// Setup error handlers
		setupErrorHandlers(conn, ch);

		logger.info("RabbitMQ connected and all queues initialized");
	} catch (err) {
		logger.error({ err }, "Failed to setup RabbitMQ");
		throw err;
	}
}

/**
 * Publishes a message to a journey queue with confirmation
 * Uses confirmChannel to ensure message delivery
 */
export async function publishToJourneyQueue(
	queue: keyof typeof JOURNEY_QUEUES,
	data: any,
	delayMs = 0,
): Promise<void> {
	if (!confirmChannel) {
		throw new Error("RabbitMQ confirmChannel not initialized");
	}

	return new Promise((resolve, reject) => {
		try {
			const published = confirmChannel!.publish(
				EXCHANGE_NAME_JOURNEY,
				JOURNEY_QUEUES[queue],
				Buffer.from(JSON.stringify(data)),
				{
					persistent: true,
					headers: { "x-delay": delayMs },
					messageId: data.jobKey, // for avoiding deduplicates
				},
			);

			if (!published) {
				confirmChannel!.once("drain", () => {
					logger.warn("RabbitMQ channel drained, message published");
					resolve();
				});
			} else {
				// waitForConfirms returns a Promise in newer versions
				// Using callback-based approach for compatibility
				(confirmChannel!.waitForConfirms as (callback?: (err?: Error) => void) => void)((err?: Error) => {
					if (err) {
						logger.error({ err }, "Failed to confirm message publish");
						reject(err);
					} else {
						resolve();
					}
				});
			}
		} catch (err) {
			logger.error({ err }, "Error publishing to journey queue");
			reject(err);
		}
	});
}

/**
 * Publishes a message to a trigger queue with confirmation
 * Uses confirmChannel to ensure message delivery
 */
export async function publishToTriggerQueue(
	queue: keyof typeof TRIGGER_QUEUES,
	data: any,
	delayMs = 0,
): Promise<void> {
	if (!confirmChannel) {
		throw new Error("RabbitMQ confirmChannel not initialized");
	}

	return new Promise((resolve, reject) => {
		try {
			const published = confirmChannel!.publish(
				EXCHANGE_NAME_TRIGGER,
				TRIGGER_QUEUES[queue],
				Buffer.from(JSON.stringify(data)),
				{
					persistent: true,
					headers: { "x-delay": delayMs },
				},
			);

			if (!published) {
				confirmChannel!.once("drain", () => {
					logger.warn("RabbitMQ channel drained, message published");
					resolve();
				});
			} else {
				// waitForConfirms returns a Promise in newer versions
				// Using callback-based approach for compatibility
				(confirmChannel!.waitForConfirms as (callback?: (err?: Error) => void) => void)((err?: Error) => {
					if (err) {
						logger.error({ err }, "Failed to confirm message publish");
						reject(err);
					} else {
						resolve();
					}
				});
			}
		} catch (err) {
			logger.error({ err }, "Error publishing to trigger queue");
			reject(err);
		}
	});
}

/**
 * Gets the RabbitMQ channel for consuming messages
 */
export function getChannel(): amqp.Channel {
	if (!channel) {
		throw new Error("RabbitMQ channel not initialized");
	}
	return channel;
}

/**
 * Gracefully closes RabbitMQ connections
 */
export async function closeRabbitMQ(): Promise<void> {
	if (reconnectTimer) {
		clearTimeout(reconnectTimer);
		reconnectTimer = null;
	}

	isReconnecting = false;

	if (confirmChannel) {
		try {
			await confirmChannel.close();
		} catch (err) {
			logger.error({ err }, "Error closing confirmChannel");
		}
		confirmChannel = null;
	}

	if (channel) {
		try {
			await channel.close();
		} catch (err) {
			logger.error({ err }, "Error closing channel");
		}
		channel = null;
	}

	if (connection) {
		try {
			// Connection.close() exists but type definitions may be incomplete
			await (connection as any).close();
		} catch (err) {
			logger.error({ err }, "Error closing connection");
		}
		connection = null;
	}

	logger.info("RabbitMQ connections closed");
}
