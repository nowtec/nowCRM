import { logger } from "../../../logger";
import { redis } from "../../../redis";

/**
 * Acquires a distributed lock using Redis SETNX
 * @param lockKey - The key for the lock
 * @param ttlSeconds - Time to live in seconds (default: 60)
 * @returns true if lock was acquired, false if already locked
 */
export async function acquireLock(
	lockKey: string,
	ttlSeconds = 60,
): Promise<boolean> {
	const lockValue = `${Date.now()}-${Math.random()}`;
	const result = await redis.set(lockKey, lockValue, "EX", ttlSeconds, "NX");
	return result === "OK";
}

/**
 * Releases a distributed lock
 * Uses Lua script to ensure atomicity - only releases if value matches
 * @param lockKey - The key for the lock
 * @param lockValue - The value that was set when acquiring the lock
 */
export async function releaseLock(
	lockKey: string,
	lockValue: string,
): Promise<void> {
	// Lua script to atomically check and delete lock
	const luaScript = `
		if redis.call("get", KEYS[1]) == ARGV[1] then
			return redis.call("del", KEYS[1])
		else
			return 0
		end
	`;
	await redis.eval(luaScript, 1, lockKey, lockValue);
}

/**
 * Extends the TTL of an existing lock
 * @param lockKey - The key for the lock
 * @param lockValue - The value that was set when acquiring the lock
 * @param ttlSeconds - New TTL in seconds
 */
async function extendLock(
	lockKey: string,
	lockValue: string,
	ttlSeconds: number,
): Promise<boolean> {
	// Lua script to atomically check and extend lock TTL
	const luaScript = `
		if redis.call("get", KEYS[1]) == ARGV[1] then
			return redis.call("expire", KEYS[1], ARGV[2])
		else
			return 0
		end
	`;
	const result = await redis.eval(
		luaScript,
		2,
		lockKey,
		lockValue,
		ttlSeconds.toString(),
	);
	return result === 1;
}

/**
 * Executes a function with a distributed lock
 * Automatically acquires and releases the lock
 * Extends lock TTL periodically if operation takes longer than expected
 * @param lockKey - The key for the lock
 * @param fn - Function to execute while holding the lock
 * @param ttlSeconds - Lock TTL in seconds (default: 60)
 * @returns Result of the function or null if lock could not be acquired
 */
export async function withLock<T>(
	lockKey: string,
	fn: () => Promise<T>,
	ttlSeconds = 60,
): Promise<T | null> {
	const lockValue = `${Date.now()}-${Math.random()}`;
	const acquired = await redis.set(lockKey, lockValue, "EX", ttlSeconds, "NX");

	if (acquired !== "OK") {
		logger.debug(
			{ lockKey },
			"Could not acquire distributed lock, skipping execution",
		);
		return null;
	}

	// Set up lock extension interval to prevent expiration during long operations
	// Extend lock every 50% of TTL to ensure it doesn't expire
	// Convert seconds to milliseconds: ttlSeconds * 1000, then take 50% = ttlSeconds * 500
	const extensionIntervalMs = Math.max(1000, ttlSeconds * 500); // At least 1 second
	let extensionIntervalId: NodeJS.Timeout | null = null;

	// Only set up extension if TTL is long enough to warrant it (> 10 seconds)
	if (ttlSeconds > 10) {
		extensionIntervalId = setInterval(async () => {
			const extended = await extendLock(lockKey, lockValue, ttlSeconds);
			if (!extended) {
				logger.warn(
					{ lockKey },
					"Failed to extend lock TTL - lock may have been released",
				);
				// Clear interval if lock was released
				if (extensionIntervalId) {
					clearInterval(extensionIntervalId);
					extensionIntervalId = null;
				}
			}
		}, extensionIntervalMs);
	}

	try {
		return await fn();
	} finally {
		if (extensionIntervalId) {
			clearInterval(extensionIntervalId);
		}
		await releaseLock(lockKey, lockValue);
	}
}
