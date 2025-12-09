import Redis from "ioredis";
import { env } from "./common/utils/env-config";
import { logger } from "./logger";

// Create Redis connection with proper error handling and reconnection
export const redis = new Redis({
	port: env.JOURNEYS_REDIS_PORT,
	host: env.JOURNEYS_REDIS_HOST,
	maxRetriesPerRequest: env.JOURNEYS_REDIS_MAX_RETRIES,
	retryStrategy: (times: number) => {
		const delay = Math.min(
			times * env.JOURNEYS_REDIS_RETRY_DELAY_MS,
			3000, // Max 3 seconds between retries
		);
		logger.debug({ times, delay }, `Redis connection retry attempt ${times}`);
		return delay;
	},
	connectTimeout: env.JOURNEYS_REDIS_CONNECT_TIMEOUT,
	commandTimeout: env.JOURNEYS_REDIS_COMMAND_TIMEOUT,
	lazyConnect: env.JOURNEYS_REDIS_LAZY_CONNECT === 1,
	enableReadyCheck: true,
	enableOfflineQueue: true,
	keepAlive: 30000,
});

// Setup error handlers
redis.on("connect", () => {
	logger.info("Redis connection established");
});

redis.on("ready", () => {
	logger.info("Redis connection ready");
});

redis.on("error", (err) => {
	logger.error({ err }, "Redis connection error");
});

redis.on("close", () => {
	logger.warn("Redis connection closed");
});

redis.on("reconnecting", (delay: number) => {
	logger.debug({ delay }, "Redis reconnecting");
});

redis.on("end", () => {
	logger.warn("Redis connection ended");
});

// Graceful shutdown handler
process.on("SIGINT", async () => {
	logger.debug("Closing Redis connection...");
	await redis.quit();
});

process.on("SIGTERM", async () => {
	logger.debug("Closing Redis connection...");
	await redis.quit();
});
