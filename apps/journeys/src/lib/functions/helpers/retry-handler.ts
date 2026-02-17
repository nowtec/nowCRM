import { env } from "@/common/utils/env-config";
import {
	classifyError,
	getBackoffMultiplier,
	isRetryableError,
} from "@/common/utils/error-classification";
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
 * Checks if error is a transaction/database error
 * Uses error classification for consistency
 */
function isTransactionError(error: Error): boolean {
	const classified = classifyError(error);
	return classified.type === "transaction_error";
}

/**
 * Checks if error indicates a timeout or slow response
 * Uses error classification for consistency
 */
function isTimeoutOrSlowResponseError(error: Error): boolean {
	const classified = classifyError(error);
	return (
		classified.type === "timeout" ||
		classified.type === "slow_response" ||
		classified.type === "network_error"
	);
}

/**
 * Checks if error should retry immediately (no backoff)
 * Only for very specific errors that are likely to succeed on immediate retry
 */
function shouldRetryImmediately(error: Error): boolean {
	const errorMessage = error.message || "";
	
	// Only retry immediately for very specific cases where immediate retry makes sense
	// For example, temporary network hiccups that might resolve instantly
	const immediateRetryPatterns: string[] = [
		// Add patterns here if we identify errors that benefit from immediate retry
		// Currently, we use backoff for all errors to be safe
	];
	
	return immediateRetryPatterns.some((pattern) =>
		errorMessage.toLowerCase().includes(pattern.toLowerCase()),
	);
}

/**
 * Publishes message to retry queue with exponential backoff
 * For DELAYED queue messages, uses backoff to prevent immediate retry failures
 * Exception: Very specific errors that benefit from immediate retry (currently none)
 */
async function republishWithRetry(
	isJourneyQueue: boolean,
	queueType: JourneyQueueType | TriggerQueueType,
	data: any,
	metadata: RetryMetadata,
	error: Error,
): Promise<void> {
	const isTransactionErr = isTransactionError(error);
	const isTimeoutOrSlow = isTimeoutOrSlowResponseError(error);
	const isDelayedQueue = queueType === "DELAYED";
	const shouldRetryNow = shouldRetryImmediately(error);

	// Classify error for better handling
	const classified = classifyError(error);
	const backoffMultiplier = getBackoffMultiplier(error);
	const isTimeoutOrSlowFromClassification =
		classified.type === "timeout" ||
		classified.type === "slow_response" ||
		classified.type === "network_error";
	
	// Calculate delay based on error type, classification, and queue type
	let delay: number;
	
	if (shouldRetryNow) {
		// Very specific cases where immediate retry makes sense
		delay = 0;
	} else if (isTransactionErr) {
		// Transaction errors always need a delay to allow transaction rollback
		delay = calculateBackoffDelay(
			metadata.retryCount,
			env.RABBITMQ_RETRY_INITIAL_DELAY_MS,
			env.RABBITMQ_RETRY_MAX_DELAY_MS,
		);
		// Apply backoff multiplier for transaction errors
		delay = Math.floor(delay * backoffMultiplier);
	} else if (isDelayedQueue) {
		// DELAYED queue errors now use backoff to prevent immediate retry failures
		// This is especially important for timeout/slow response errors
		// The original delay has already passed, so we add backoff for retries
		delay = calculateBackoffDelay(
			metadata.retryCount,
			env.RABBITMQ_RETRY_INITIAL_DELAY_MS,
			env.RABBITMQ_RETRY_MAX_DELAY_MS,
		);
		
		// Apply error-type-specific backoff multiplier
		delay = Math.floor(delay * backoffMultiplier);
		
		// For timeout errors, use longer initial delay to give Strapi more time to recover
		if (classified.type === "timeout" && metadata.retryCount === 0) {
			delay = Math.max(
				delay,
				env.RABBITMQ_RETRY_INITIAL_DELAY_MS * 2, // Double initial delay for timeout errors
			);
		}
	} else {
		// Other queues use standard exponential backoff with error-type multiplier
		delay = calculateBackoffDelay(
			metadata.retryCount,
			env.RABBITMQ_RETRY_INITIAL_DELAY_MS,
			env.RABBITMQ_RETRY_MAX_DELAY_MS,
		);
		// Apply error-type-specific backoff multiplier
		delay = Math.floor(delay * backoffMultiplier);
	}

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
			delaySeconds: Math.floor(delay / 1000),
			isDelayedQueue,
			errorType: classified.type,
			errorDescription: classified.description,
			isRetryable: classified.isRetryable,
			backoffMultiplier,
			isTransactionError: isTransactionErr,
			isTimeoutOrSlow: isTimeoutOrSlowFromClassification,
			error: error.message,
		},
		`Republishing message to ${queueType} queue with retry (${classified.type}: ${classified.description})`,
	);

	if (isJourneyQueue) {
		// For delayed queue, republish back to DELAYED queue with calculated delay
		// This ensures "wait" and "scheduler-trigger" steps stay in the correct queue
		// Delay is now calculated with backoff to prevent immediate retry failures
		await publishToJourneyQueue(
			queueType as JourneyQueueType,
			retryData,
			delay, // Calculated delay with backoff for DELAYED queue retries
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
 * Uses error classification for consistent retry decisions
 */
function shouldRetry(error: Error, retryCount: number): boolean {
	// Don't retry if max retries exceeded
	if (retryCount >= env.RABBITMQ_MAX_RETRIES) {
		return false;
	}

	// Use error classification to determine if error is retryable
	const classified = classifyError(error);
	
	// Don't retry non-retryable errors
	if (!classified.isRetryable) {
		logger.debug(
			{
				errorType: classified.type,
				errorDescription: classified.description,
				retryCount,
			},
			"Error is not retryable based on classification",
		);
		return false;
	}

	// Don't retry on certain error messages (application-level errors)
	const nonRetryableErrorMessages = [
		"Job processor can only handle",
		"should only be called for",
		"Step type",
		"requires timing but none was provided",
		"requires a composition but none was found",
	];

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
