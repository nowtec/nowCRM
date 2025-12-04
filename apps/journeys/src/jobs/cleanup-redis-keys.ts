import { redis } from "../redis";
import { logger } from "../logger";
import { withLock } from "../lib/functions/helpers/distributed-lock";
import { env } from "../common/utils/env-config";

const CLEANUP_LOCK_KEY = "redis-cleanup:lock";
const CLEANUP_LOCK_TTL = 600; // 10 minutes

// Redis key patterns to clean up
const KEY_PATTERNS = {
	JOB_KEYS: "job-contact:*",
	JOURNEY_JOBS: "journey-job:*",
};

// Maximum age for keys before cleanup (in seconds)
const MAX_KEY_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

/**
 * Scans Redis for keys matching a pattern and returns them in batches
 */
async function* scanKeys(pattern: string, batchSize = 100): AsyncGenerator<string[]> {
	let cursor = "0";
	
	do {
		const [nextCursor, keys] = await redis.scan(
			cursor,
			"MATCH",
			pattern,
			"COUNT",
			batchSize,
		);
		cursor = nextCursor;
		
		if (keys.length > 0) {
			yield keys;
		}
	} while (cursor !== "0");
}

/**
 * Checks if a key is orphaned (exists but shouldn't)
 * For job keys, we check if they're older than expected TTL
 */
async function isOrphanedKey(key: string): Promise<boolean> {
	const ttl = await redis.ttl(key);
	
	// If key has no expiration or expiration is way too long, it might be orphaned
	if (ttl === -1) {
		// Key exists but has no expiration - definitely orphaned
		return true;
	}
	
	// If key expiration is longer than max age, it's likely orphaned
	if (ttl > MAX_KEY_AGE_SECONDS) {
		return true;
	}
	
	// For job keys, check if they're very old (past their expected lifetime)
	// This is a heuristic - ideally we'd track job completion, but this catches obvious orphans
	return false;
}

/**
 * Cleans up orphaned Redis keys
 */
export async function cleanupOrphanedRedisKeys(): Promise<void> {
	const result = await withLock(
		CLEANUP_LOCK_KEY,
		async () => {
			logger.info("Starting Redis key cleanup...");
			let totalCleaned = 0;
			let totalScanned = 0;
			
			// Clean up job keys
			for (const [patternName, pattern] of Object.entries(KEY_PATTERNS)) {
				logger.info(`Scanning pattern: ${pattern}`);
				let patternCleaned = 0;
				let patternScanned = 0;
				
				for await (const keys of scanKeys(pattern)) {
					patternScanned += keys.length;
					totalScanned += keys.length;
					
					// Check each key in batch
					const orphanedKeys: string[] = [];
					
					for (const key of keys) {
						if (await isOrphanedKey(key)) {
							orphanedKeys.push(key);
						}
					}
					
					// Delete orphaned keys in batch
					if (orphanedKeys.length > 0) {
						await redis.del(...orphanedKeys);
						patternCleaned += orphanedKeys.length;
						totalCleaned += orphanedKeys.length;
						
						logger.debug(
							{ pattern: patternName, cleaned: orphanedKeys.length },
							`Cleaned up ${orphanedKeys.length} orphaned keys`,
						);
					}
					
					// Yield to event loop periodically to avoid blocking
					if (patternScanned % 1000 === 0) {
						await new Promise((resolve) => setImmediate(resolve));
					}
				}
				
				logger.info(
					{
						pattern: patternName,
						scanned: patternScanned,
						cleaned: patternCleaned,
					},
					`Completed cleanup for pattern ${patternName}`,
				);
			}
			
			logger.info(
				{ totalScanned, totalCleaned },
				`Redis cleanup completed: scanned ${totalScanned} keys, cleaned ${totalCleaned} orphaned keys`,
			);
			
			return { totalScanned, totalCleaned };
		},
		CLEANUP_LOCK_TTL,
	);
	
	if (result === null) {
		logger.info("Cleanup lock already held by another instance, skipping execution");
	}
}

