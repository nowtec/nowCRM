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
 * Executes a function with a distributed lock
 * Automatically acquires and releases the lock
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
		logger.warn(
			{ lockKey },
			"Could not acquire distributed lock, skipping execution",
		);
		return null;
	}

	try {
		return await fn();
	} finally {
		await releaseLock(lockKey, lockValue);
	}
}
