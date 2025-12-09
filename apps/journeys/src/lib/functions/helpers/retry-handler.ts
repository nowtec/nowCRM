import { env } from "@/common/utils/env-config";
import type { JOURNEY_QUEUES, TRIGGER_QUEUES } from "@/config";
import { logger } from "@/logger";
import { publishToJourneyQueue, publishToTriggerQueue } from "@/rabbitmq";

type JourneyQueueType = keyof typeof JOURNEY_QUEUES;
type TriggerQueueType = keyof typeof TRIGGER_QUEUES;

interface RetryMetadata {
	retryCount: number;
	firstAttemptAt: string;
	lastAttemptAt: string;
	originalError?: string;
}

/**
 * Calculates exponential backoff delay with jitter
 * @param retryCount - Current retry attempt (0-indexed)
 * @param initialDelayMs - Initial delay in milliseconds
 * @param maxDelayMs - Maximum delay in milliseconds
 * @returns Delay in milliseconds
 */
function calculateBackoffDelay(
	retryCount: number,
	initialDelayMs: number,
	maxDelayMs: number,
): number {
	const exponentialDelay = initialDelayMs * 2 ** retryCount;
	const jitter = Math.random() * 0.3 * exponentialDelay; // Add up to 30% jitter
	const delay = Math.min(exponentialDelay + jitter, maxDelayMs);
	return Math.floor(delay);
}

/**
 * Extracts retry metadata from message headers
 */
function getRetryMetadata(msg: any): RetryMetadata {
	const headers = msg.properties?.headers || {};
	return {
		retryCount: headers["x-retry-count"] || 0,
		firstAttemptAt: headers["x-first-attempt-at"] || new Date().toISOString(),
		lastAttemptAt: headers["x-last-attempt-at"] || new Date().toISOString(),
		originalError: headers["x-original-error"],
	};
}

/**
 * Creates updated headers with retry metadata
 */
function createRetryHeaders(
	metadata: RetryMetadata,
	error?: Error,
): Record<string, string | number> {
	return {
		"x-retry-count": metadata.retryCount + 1,
		"x-first-attempt-at": metadata.firstAttemptAt,
		"x-last-attempt-at": new Date().toISOString(),
		...(error && { "x-original-error": error.message }),
	};
}

/**
 * Checks if error is a transaction/database error or 500 error that requires a delay before retry
 * 500 errors often indicate transient issues like transaction errors, deadlocks, etc.
 */
function isTransactionError(error: Error): boolean {
	const errorMessage = error.message || "";
	const transactionErrorPatterns = [
		"current transaction is aborted",
		"transaction is aborted",
		"deadlock detected",
		"could not serialize access",
		"lock not available",
		"500", // 500 errors often indicate transaction errors or other transient issues
	];
	return transactionErrorPatterns.some((pattern) =>
		errorMessage.toLowerCase().includes(pattern.toLowerCase()),
	);
}

/**
 * Publishes message to retry queue with exponential backoff
 * For DELAYED queue messages, retries immediately (delay = 0) since original delay already passed
 * Exception: Transaction errors always get a delay to allow transaction rollback
 */
async function republishWithRetry(
	isJourneyQueue: boolean,
	queueType: JourneyQueueType | TriggerQueueType,
	data: any,
	metadata: RetryMetadata,
	error: Error,
): Promise<void> {
	// Check if this is a transaction error - these need a delay even for DELAYED queue
	const isTransactionErr = isTransactionError(error);
	const isDelayedQueue = queueType === "DELAYED";

	// Transaction errors always need a delay to allow transaction rollback
	// For delayed messages, retry immediately unless it's a transaction error
	// For other queues, use exponential backoff
	const delay = isTransactionErr
		? calculateBackoffDelay(
				metadata.retryCount,
				env.RABBITMQ_RETRY_INITIAL_DELAY_MS,
				env.RABBITMQ_RETRY_MAX_DELAY_MS,
			)
		: isDelayedQueue
			? 0 // Retry immediately for delayed messages (non-transaction errors)
			: calculateBackoffDelay(
					metadata.retryCount,
					env.RABBITMQ_RETRY_INITIAL_DELAY_MS,
					env.RABBITMQ_RETRY_MAX_DELAY_MS,
				);

	const retryHeaders = createRetryHeaders(metadata, error);
	const retryData = {
		...data,
		_retryMetadata: retryHeaders,
	};

	logger.debug(
		{
			queueType,
			retryCount: metadata.retryCount + 1,
			maxRetries: env.RABBITMQ_MAX_RETRIES,
			delay,
			isDelayedQueue,
			isTransactionError: isTransactionErr,
			error: error.message,
		},
		`Republishing message to ${queueType} queue with retry${isTransactionErr ? " (transaction error - delayed retry)" : ""}`,
	);

	if (isJourneyQueue) {
		// For delayed queue, republish back to DELAYED queue with delay=0 for immediate retry
		// This ensures "wait" and "scheduler-trigger" steps stay in the correct queue
		await publishToJourneyQueue(
			queueType as JourneyQueueType,
			retryData,
			delay, // delay=0 for DELAYED queue (immediate retry), exponential backoff for others
		);
	} else {
		await publishToTriggerQueue(
			queueType as TriggerQueueType,
			retryData,
			delay,
		);
	}
}

/**
 * Determines if a message should be retried based on error type and retry count
 */
function shouldRetry(error: Error, retryCount: number): boolean {
	// Don't retry if max retries exceeded
	if (retryCount >= env.RABBITMQ_MAX_RETRIES) {
		return false;
	}

	// Don't retry on certain error types (e.g., validation errors, wrong queue routing)
	const nonRetryableErrorNames = [
		"ValidationError",
		"NotFoundError",
		"UnauthorizedError",
		"ForbiddenError",
	];

	const nonRetryableErrorMessages = [
		"Job processor can only handle",
		"should only be called for",
		"Step type",
		"requires timing but none was provided",
		"requires a composition but none was found",
		// Note: Transaction errors are retryable but need a delay (handled in republishWithRetry)
	];

	const errorName = error.constructor.name;
	if (nonRetryableErrorNames.includes(errorName)) {
		return false;
	}

	const errorMessage = error.message || "";
	if (nonRetryableErrorMessages.some((msg) => errorMessage.includes(msg))) {
		return false;
	}

	// Retry on network errors, timeouts, and transient errors
	return true;
}

/**
 * Handles message retry logic with exponential backoff
 * @param isJourneyQueue - Whether this is a journey queue (true) or trigger queue (false)
 * @param queueType - Type of queue (JOURNEY, JOB, TRIGGER, etc.)
 * @param queueName - Name of the queue
 * @param msg - RabbitMQ message
 * @param data - Parsed message data
 * @param error - Error that occurred during processing
 * @returns true if message was requeued for retry, false if sent to DLX
 */
export async function handleMessageRetry(
	isJourneyQueue: boolean,
	queueType: JourneyQueueType | TriggerQueueType,
	queueName: string,
	msg: any,
	data: any,
	error: Error,
): Promise<boolean> {
	const metadata = getRetryMetadata(msg);

	if (!shouldRetry(error, metadata.retryCount)) {
		logger.error(
			{
				queueType,
				queueName,
				retryCount: metadata.retryCount,
				maxRetries: env.RABBITMQ_MAX_RETRIES,
				error: error.message,
			},
			"Message exceeded max retries or non-retryable error, sending to DLX",
		);
		return false; // Send to DLX
	}

	try {
		await republishWithRetry(isJourneyQueue, queueType, data, metadata, error);
		return true; // Successfully requeued
	} catch (retryError) {
		logger.error(
			{ err: retryError, queueType, queueName },
			"Failed to republish message for retry, sending to DLX",
		);
		return false; // Send to DLX
	}
}
