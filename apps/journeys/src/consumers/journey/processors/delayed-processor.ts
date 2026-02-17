import type { delayedProcessorJobData } from "@nowcrm/services";
import { env } from "../../../common/utils/env-config";
import {
	closeJob,
	createNextJob,
	createRuleCheckJob,
} from "../../../jobs/create-job";
import { addJourneyPassedStep } from "../../../lib/functions/add-journey-passed-step";
import { extendJobKeyTTL } from "../../../lib/functions/helpers/check-job-exists";
import { checkJourneyStatus } from "../../../lib/functions/helpers/check-journey-active";
import { checkStepPassed } from "../../../lib/functions/helpers/check-step-passed";
import { getJourneyStep } from "../../../lib/functions/helpers/get-journey-step";
import { processJob } from "../../../lib/functions/process-job";
import { createContactActionAndScore } from "../../../lib/functions/rules/create-action-and-score";
import { logger } from "../../../logger";
import { publishToJourneyQueue } from "../../../rabbitmq";

export async function processDelayedMessage(data: delayedProcessorJobData) {
	const {
		jobId,
		contactId,
		stepId,
		journeyId,
		type,
		channel,
		compositionId,
		timing,
		ignoreSubscription,
	} = data;
	logger.debug(`Processing delayed job: ${jobId}`);

	// Check journey status before processing
	const journeyStatus = await checkJourneyStatus(journeyId);

	if (journeyStatus === "deleted") {
		logger.info(
			{
				jobId,
				contactId,
				stepId,
				journeyId,
				type,
			},
			"Journey was deleted, closing delayed job",
		);
		await closeJob(jobId);
		return; // Consumer will ack the message
	}

	if (journeyStatus === "paused") {
		logger.info(
			{
				jobId,
				contactId,
				stepId,
				journeyId,
				type,
				delayHours:
					env.JOURNEYS_PAUSED_JOURNEY_RETRY_DELAY_MS / (60 * 60 * 1000),
			},
			"Journey is paused/inactive, republishing delayed job with delay to check if journey was reactivated",
		);
		// Republish to DELAYED queue with delay to check again later
		// This allows the job to be processed when journey is reactivated
		await publishToJourneyQueue(
			"DELAYED",
			data,
			env.JOURNEYS_PAUSED_JOURNEY_RETRY_DELAY_MS,
		);
		return; // Consumer will ack the message after successful republish
	}

	// Extend job key TTL when processing starts to prevent expiration during long operations
	// This ensures the job key doesn't expire if processing takes longer than expected
	await extendJobKeyTTL(contactId, journeyId, stepId);

	if (!timing) {
		const error = new Error(
			`Job ${jobId} missing timing - delayed messages must have timing`,
		);
		logger.error({ jobId, contactId, stepId, journeyId, type }, error.message);
		throw error; // Throw error so consumer can handle it (retry or DLX)
	}
	if (type === "wait" || type === "scheduler-trigger" || type === "publish") {
		// what we do here is that if we know its just a wait node(or a schedule node)
		//all we need is to wait time and pass contact to the next step
		//So when time is on and this function is runned we start job for all connected steps or ending if for some reason this is the last one node
		const step = await getJourneyStep(stepId);
		if (!step.success) {
			// Check if step was deleted (404)
			if (
				step.message?.includes("not found") ||
				step.message?.includes("deleted")
			) {
				logger.info(
					{
						jobId,
						contactId,
						stepId,
						journeyId,
						type,
					},
					"Journey step was deleted, closing delayed job",
				);
				await closeJob(jobId);
				return; // Consumer will ack the message
			}
			throw new Error(step.message);
		}
		if (!step.responseObject) {
			throw new Error("Step response has no data");
		}

		// Mark wait step as passed (no composition/channel needed for wait steps)
		await closeJob(jobId);

		if (step.responseObject.connections_from_this_step?.length) {
			// Process all connections from this step
			let jobsCreated = 0;
			for (const connection_step of step.responseObject
				.connections_from_this_step) {
				try {
					logger.debug(
						{
							contactId,
							journeyId,
							stepId,
							targetStepId: connection_step.target_step.documentId,
							type,
						},
						"Creating next job from wait step",
					);
					// Add timeout to prevent hanging forever
					const createJobPromise = createNextJob(
						{
							contactId,
							journeyId,
							stepId,
						},
						connection_step.target_step.documentId,
					);
					const timeoutPromise = new Promise((_, reject) => {
						setTimeout(
							() =>
								reject(
									new Error(
										`Timeout creating next job for step ${connection_step.target_step.documentId}`,
									),
								),
							15000,
						); // 15 second timeout
					});
					await Promise.race([createJobPromise, timeoutPromise]);
					jobsCreated++;
					logger.debug(
						{
							contactId,
							journeyId,
							stepId,
							targetStepId: connection_step.target_step.documentId,
							type,
						},
						"Successfully created next job from wait step",
					);
				} catch (nextJobError) {
					logger.error(
						{
							err: nextJobError,
							contactId,
							journeyId,
							stepId,
							targetStepId: connection_step.target_step.documentId,
							type,
						},
						"Failed to create next job from wait step",
					);
					// Re-throw to let consumer handle retry
					throw nextJobError;
				}
			}
			// Wait step completed, all next jobs created
			logger.debug(
				{
					contactId,
					journeyId,
					stepId,
					type,
					jobsCreated,
					totalConnections:
						step.responseObject.connections_from_this_step.length,
				},
				"Wait step completed, created jobs for all connected steps",
			);
			return;
		} else {
			// Last step of journey - remove contact from journey
			const scoreResp = await createContactActionAndScore(stepId, contactId);
			if (!scoreResp.success) throw new Error(scoreResp.message);
			await createNextJob(data, null);
			logger.debug(
				{ contactId, journeyId, stepId, type },
				"Wait step completed, journey finished, removing contact from journey",
			);
			return;
		}
	}

	// Idempotency check: Verify step hasn't already been passed
	// This prevents duplicate processing if job is redelivered or processed multiple times
	// Only check for channel steps (wait/scheduler-trigger/publish steps don't have composition/channel)
	const hasPassed =
		compositionId && channel
			? await checkStepPassed(
					stepId,
					contactId,
					journeyId,
					compositionId,
					channel,
				)
			: false;

	if (hasPassed) {
		logger.info(
			{
				jobId,
				contactId,
				stepId,
				journeyId,
				type,
				compositionId,
				channel,
			},
			"Step has already been passed, skipping processing (idempotency check)",
		);
		// Close the job since it's already been processed
		await closeJob(jobId);
		// Still create next job/rule check if needed, as the step was already processed
		const stepResp = await getJourneyStep(stepId);
		if (!stepResp.success) {
			// Check if step was deleted (404)
			if (
				stepResp.message?.includes("not found") ||
				stepResp.message?.includes("deleted")
			) {
				logger.info(
					{
						jobId,
						contactId,
						stepId,
						journeyId,
						type,
					},
					"Journey step was deleted during idempotency check, job already closed",
				);
				return; // Consumer will ack the message
			}
			throw new Error(stepResp.message);
		}
		if (!stepResp.responseObject) {
			throw new Error("Step response has no data");
		}

		if (stepResp.responseObject.connections_from_this_step?.length) {
			await createRuleCheckJob(data);
		} else {
			const scoreResp = await createContactActionAndScore(stepId, contactId);
			if (!scoreResp.success) throw new Error(scoreResp.message);
			await createNextJob(data, null);
		}
		return;
	}

	await processJob(contactId, stepId, journeyId, ignoreSubscription);
	const passedStep = await addJourneyPassedStep(
		stepId,
		contactId,
		journeyId,
		compositionId,
		channel,
	);

	if (!passedStep.success) {
		throw new Error(passedStep.message);
	}
	await closeJob(jobId);

	const stepResp = await getJourneyStep(stepId);
	if (!stepResp.success) {
		// Check if step was deleted (404)
		if (
			stepResp.message?.includes("not found") ||
			stepResp.message?.includes("deleted")
		) {
			logger.info(
				{
					jobId,
					contactId,
					stepId,
					journeyId,
					type,
				},
				"Journey step was deleted after processing, job already closed",
			);
			return; // Consumer will ack the message
		}
		throw new Error(stepResp.message);
	}
	if (!stepResp.responseObject) {
		throw new Error("Step response has no data");
	}

	if (stepResp.responseObject.connections_from_this_step?.length) {
		await createRuleCheckJob(data);
	} else {
		const scoreResp = await createContactActionAndScore(stepId, contactId);
		if (!scoreResp.success) throw new Error(scoreResp.message);
		await createNextJob(data, null);
	}
}
