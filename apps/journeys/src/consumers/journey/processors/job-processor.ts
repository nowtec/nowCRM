import type { jobProcessorJobData } from "@nowcrm/services";
import {
	closeJob,
	createNextJob,
	createRuleCheckJob,
} from "../../../jobs/create-job";
import { env } from "../../../common/utils/env-config";
import { addJourneyPassedStep } from "../../../lib/functions/add-journey-passed-step";
import { extendJobKeyTTL } from "../../../lib/functions/helpers/check-job-exists";
import {
	checkJourneyStatus,
	isJourneyActive,
} from "../../../lib/functions/helpers/check-journey-active";
import { checkStepPassed } from "../../../lib/functions/helpers/check-step-passed";
import { getJourneyStep } from "../../../lib/functions/helpers/get-journey-step";
import { processJob } from "../../../lib/functions/process-job";
import { createContactActionAndScore } from "../../../lib/functions/rules/create-action-and-score";
import { logger } from "../../../logger";
import { publishToJourneyQueue } from "../../../rabbitmq";

export async function processJobMessage(data: jobProcessorJobData) {
	const {
		jobId,
		contactId,
		stepId,
		journeyId,
		channel,
		compositionId,
		ignoreSubscription,
	} = data;
	logger.debug(`Processing job ${jobId}`);

	// Check journey status before processing
	const journeyStatus = await checkJourneyStatus(journeyId);
	
	if (journeyStatus === "deleted") {
		logger.info(
			{
				jobId,
				contactId,
				stepId,
				journeyId,
			},
			"Journey was deleted, closing job",
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
				delayHours: env.JOURNEYS_PAUSED_JOURNEY_RETRY_DELAY_MS / (60 * 60 * 1000),
			},
			"Journey is paused/inactive, republishing job with delay to check if journey was reactivated",
		);
		// Republish to JOB queue with delay to check again later
		// This allows the job to be processed when journey is reactivated
		await publishToJourneyQueue("JOB", data, env.JOURNEYS_PAUSED_JOURNEY_RETRY_DELAY_MS);
		return; // Consumer will ack the message after successful republish
	}

	// Extend job key TTL when processing starts to prevent expiration during long operations
	// This ensures the job key doesn't expire if processing takes longer than expected
	await extendJobKeyTTL(contactId, journeyId, stepId);

	// Get step to verify it's a "channel" type
	// JOB queue should only process "channel" type steps
	// "wait", "scheduler-trigger", and "publish" steps should go through DELAYED queue
	const stepResp = await getJourneyStep(stepId);
	if (!stepResp.success) {
		// Check if step was deleted (404)
		if (stepResp.message?.includes("not found") || stepResp.message?.includes("deleted")) {
			logger.info(
				{
					jobId,
					contactId,
					stepId,
					journeyId,
				},
				"Journey step was deleted, closing job",
			);
			await closeJob(jobId);
			return; // Consumer will ack the message
		}
		throw new Error(stepResp.message);
	}
	
	if (!stepResp.responseObject) {
		throw new Error("Step response has no data");
	}

	const stepType = stepResp.responseObject.type;
	if (stepType !== "channel") {
		logger.error(
			{
				jobId,
				stepId,
				stepType,
				expectedType: "channel",
			},
			`Job processor received non-channel step type. This should not happen. Step type "${stepType}" should be processed via DELAYED queue.`,
		);
		throw new Error(
			`Job processor can only handle "channel" type steps, but received "${stepType}". This step should be processed via DELAYED queue.`,
		);
	}

	// Idempotency check: Verify step hasn't already been passed
	// This prevents duplicate processing if job is redelivered or processed multiple times
	const hasPassed = await checkStepPassed(
		stepId,
		contactId,
		journeyId,
		compositionId,
		channel,
	);

	if (hasPassed) {
		logger.info(
			{
				jobId,
				contactId,
				stepId,
				journeyId,
				compositionId,
				channel,
			},
			"Step has already been passed, skipping processing (idempotency check)",
		);
		// Close the job since it's already been processed
		await closeJob(jobId);
		// Still create next job/rule check if needed, as the step was already processed
		const step = stepResp.responseObject;
		if (step.connections_from_this_step?.length) {
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

	const step = stepResp.responseObject;
	if (step.connections_from_this_step?.length) {
		await createRuleCheckJob(data);
	} else {
		const scoreResp = await createContactActionAndScore(stepId, contactId);
		if (!scoreResp.success) throw new Error(scoreResp.message);
		await createNextJob(data, null);
	}
}
