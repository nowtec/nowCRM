import type { jobProcessorJobData } from "@nowcrm/services";
import {
	closeJob,
	createNextJob,
	createRuleCheckJob,
} from "../../../jobs/create-job";
import { addJourneyPassedStep } from "../../../lib/functions/add-journey-passed-step";
import { extendJobKeyTTL } from "../../../lib/functions/helpers/check-job-exists";
import { getJourneyStep } from "../../../lib/functions/helpers/get-journey-step";
import { processJob } from "../../../lib/functions/process-job";
import { createContactActionAndScore } from "../../../lib/functions/rules/create-action-and-score";
import { logger } from "../../../logger";

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

	// Extend job key TTL when processing starts to prevent expiration during long operations
	// This ensures the job key doesn't expire if processing takes longer than expected
	await extendJobKeyTTL(contactId, journeyId, stepId);

	// Get step to verify it's a "channel" type
	// JOB queue should only process "channel" type steps
	// "wait", "scheduler-trigger", and "publish" steps should go through DELAYED queue
	const stepResp = await getJourneyStep(stepId);
	if (!stepResp.success || !stepResp.responseObject) {
		throw new Error(stepResp.message);
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
