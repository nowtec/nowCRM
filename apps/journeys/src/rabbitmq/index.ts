import * as amqp from "amqplib";
import { env } from "../common/utils/env-config";
import {
	EXCHANGE_NAME_JOURNEY,
	EXCHANGE_NAME_TRIGGER,
	EXCHANGE_TYPE,
	JOURNEY_QUEUES,
	RABBITMQ_URL,
	TRIGGER_QUEUES,
} from "../config";
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
 * Logs queue status to help debug unacked messages
 * Note: checkQueue doesn't return unacked count, but we log ready messages and consumers
 */
async function logQueueStatus(ch: amqp.Channel) {
	try {
		const allQueues = [
			...Object.values(JOURNEY_QUEUES),
			...Object.values(TRIGGER_QUEUES),
		];

		for (const queueName of allQueues) {
			const queueInfo = await ch.checkQueue(queueName);
			if (queueInfo.messageCount > 0 || queueInfo.consumerCount > 0) {
				logger.debug(
					{
						queue: queueName,
						ready: queueInfo.messageCount,
						consumers: queueInfo.consumerCount,
						note: "Unacked messages are not shown here - check RabbitMQ UI for unacked count",
					},
					`Queue status: ${queueName}`,
				);
			}
		}

		// Warn if there are ready messages but no consumers (might indicate stale messages)
		for (const queueName of allQueues) {
			const queueInfo = await ch.checkQueue(queueName);
			if (queueInfo.messageCount > 0 && queueInfo.consumerCount === 0) {
				logger.warn(
					{
						queue: queueName,
						ready: queueInfo.messageCount,
						note: "Messages in queue but no active consumers. Consumers should start shortly.",
					},
					`Queue has messages but no consumers: ${queueName}`,
				);
			}
		}
	} catch (err) {
		logger.warn({ err }, "Failed to check queue status");
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
		// When channel closes, all unacked messages are automatically requeued by RabbitMQ
		if (!isReconnecting) {
			reconnect();
		}
	});

	// Handle consumer cancellation (e.g., when queue is deleted or consumer is cancelled)
	ch.on("cancel", (consumerTag: string) => {
		logger.warn({ consumerTag }, "RabbitMQ consumer cancelled");
		// When consumer is cancelled, unacked messages are automatically requeued
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
		Math.min(2 ** (reconnectAttempts - 1), 10);

	logger.info(
		`Attempting to reconnect to RabbitMQ (attempt ${reconnectAttempts}/${env.RABBITMQ_MAX_RECONNECT_ATTEMPTS}) in ${delay}ms...`,
	);

	// Clean up old connection
	if (channel) {
		try {
			await channel.close();
		} catch (_err) {
			// Ignore errors during cleanup
		}
		channel = null;
	}

	if (confirmChannel) {
		try {
			await confirmChannel.close();
		} catch (_err) {
			// Ignore errors during cleanup
		}
		confirmChannel = null;
	}

	if (connection) {
		try {
			// Connection.close() exists but type definitions may be incomplete
			await (connection as any).close();
		} catch (_err) {
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
		// Validate RabbitMQ URL is set
		if (!RABBITMQ_URL) {
			throw new Error("RABBITMQ_URL environment variable is not set");
		}

		logger.info(
			`Connecting to RabbitMQ at ${RABBITMQ_URL.replace(/:[^:@]+@/, ":****@")}`,
		);

		// Type assertion needed due to incomplete type definitions
		const conn = (await amqp.connect(
			RABBITMQ_URL,
		)) as unknown as amqp.Connection;
		connection = conn;

		const ch = (await (conn as any).createChannel()) as amqp.Channel;
		channel = ch;

		const confirmCh = (await (
			conn as any
		).createConfirmChannel()) as amqp.ConfirmChannel;
		confirmChannel = confirmCh;

		// Set prefetch limit to prevent overwhelming consumers
		const prefetchCount = env.RABBITMQ_PREFETCH_COUNT;
		await ch.prefetch(prefetchCount);
		await confirmCh.prefetch(prefetchCount);

		logger.debug(
			`RabbitMQ prefetch count set to ${prefetchCount} messages per consumer`,
		);

		// Setup exchanges and queues
		await setupExchangesAndQueues(ch);

		// Setup error handlers
		setupErrorHandlers(conn, ch);

		// Log queue status to help debug unacked messages
		await logQueueStatus(ch);

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
			// Build options object with persistent and messageId at top level
			// Custom headers like x-delay go in the headers property
			const options: amqp.Options.Publish = {
				persistent: true,
				messageId: data.jobKey, // for avoiding deduplicates
			};

			if (delayMs > 0) {
				options.headers = { "x-delay": delayMs };
			}

			const published = confirmChannel?.publish(
				EXCHANGE_NAME_JOURNEY,
				JOURNEY_QUEUES[queue],
				Buffer.from(JSON.stringify(data)),
				options,
			);

			if (!published) {
				// Channel buffer is full, wait for drain event
				const drainTimeoutId = setTimeout(() => {
					logger.error(
						{
							queue: JOURNEY_QUEUES[queue],
							delayMs,
							jobId: data.jobId,
						},
						"Timeout waiting for channel drain",
					);
					reject(
						new Error(
							`Timeout waiting for channel drain for queue ${JOURNEY_QUEUES[queue]}`,
						),
					);
				}, 10000); // 10 second timeout

				confirmChannel?.once("drain", () => {
					clearTimeout(drainTimeoutId);
					logger.debug(
						{
							queue: JOURNEY_QUEUES[queue],
							delayMs,
							jobId: data.jobId,
						},
						"RabbitMQ channel drained, message published",
					);
					resolve();
				});
			} else {
				// Message was published immediately (publish returned true)
				// On a confirm channel, this means the message was sent to RabbitMQ
				// The confirm channel will handle confirmations asynchronously
				// If there's an error, the error handlers will catch it
				logger.debug(
					{
						queue: JOURNEY_QUEUES[queue],
						delayMs,
						jobId: data.jobId,
					},
					"Message published successfully (confirmation handled asynchronously)",
				);
				resolve();
			}
		} catch (err) {
			logger.error(
				{ err, queue: JOURNEY_QUEUES[queue], delayMs },
				"Error publishing to journey queue",
			);
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
			// Build options object with persistent at top level
			// Custom headers like x-delay go in the headers property
			const options: amqp.Options.Publish = {
				persistent: true,
			};

			if (delayMs > 0) {
				options.headers = { "x-delay": delayMs };
			}

			const published = confirmChannel?.publish(
				EXCHANGE_NAME_TRIGGER,
				TRIGGER_QUEUES[queue],
				Buffer.from(JSON.stringify(data)),
				options,
			);

			if (!published) {
				// Channel buffer is full, wait for drain event
				const drainTimeoutId = setTimeout(() => {
					logger.error(
						{
							queue: TRIGGER_QUEUES[queue],
							delayMs,
						},
						"Timeout waiting for channel drain",
					);
					reject(
						new Error(
							`Timeout waiting for channel drain for queue ${TRIGGER_QUEUES[queue]}`,
						),
					);
				}, 10000); // 10 second timeout

				confirmChannel?.once("drain", () => {
					clearTimeout(drainTimeoutId);
					logger.debug(
						{
							queue: TRIGGER_QUEUES[queue],
							delayMs,
						},
						"RabbitMQ channel drained, message published",
					);
					resolve();
				});
			} else {
				// Message was published immediately (publish returned true)
				// On a confirm channel, this means the message was sent to RabbitMQ
				// The confirm channel will handle confirmations asynchronously
				// If there's an error, the error handlers will catch it
				logger.debug(
					{
						queue: TRIGGER_QUEUES[queue],
						delayMs,
					},
					"Message published successfully (confirmation handled asynchronously)",
				);
				resolve();
			}
		} catch (err) {
			logger.error(
				{ err, queue: TRIGGER_QUEUES[queue], delayMs },
				"Error publishing to trigger queue",
			);
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
 * When channels/connections close, RabbitMQ automatically requeues all unacked messages
 */
export async function closeRabbitMQ(): Promise<void> {
	if (reconnectTimer) {
		clearTimeout(reconnectTimer);
		reconnectTimer = null;
	}

	isReconnecting = false;

	// Close channels first - this will cause RabbitMQ to requeue all unacked messages
	if (confirmChannel) {
		try {
			await confirmChannel.close();
			logger.debug("ConfirmChannel closed - unacked messages will be requeued");
		} catch (err) {
			logger.error({ err }, "Error closing confirmChannel");
		}
		confirmChannel = null;
	}

	if (channel) {
		try {
			await channel.close();
			logger.debug("Channel closed - unacked messages will be requeued");
		} catch (err) {
			logger.error({ err }, "Error closing channel");
		}
		channel = null;
	}

	// Close connection last
	if (connection) {
		try {
			// Connection.close() exists but type definitions may be incomplete
			await (connection as any).close();
		} catch (err) {
			logger.error({ err }, "Error closing connection");
		}
		connection = null;
	}

	logger.debug(
		"RabbitMQ connections closed - all unacked messages have been requeued",
	);
}
