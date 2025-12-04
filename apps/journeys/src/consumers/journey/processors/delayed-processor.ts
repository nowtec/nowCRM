import type { delayedProcessorJobData } from "@nowcrm/services";
import {
	closeJob,
	createNextJob,
	createRuleCheckJob,
} from "../../../jobs/create-job";
import { addJourneyPassedStep } from "../../../lib/functions/add-journey-passed-step";
import { getJourneyStep } from "../../../lib/functions/helpers/get-journey-step";
import { processJob } from "../../../lib/functions/process-job";
import { createContactActionAndScore } from "../../../lib/functions/rules/create-action-and-score";
import { logger } from "../../../logger";

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
	logger.info(`Processing delayed job: ${jobId}`);

	if (!timing) {
		logger.error(`Job ${jobId} missing timing`);
		return;
	}
	if (type === "wait" || type === "scheduler-trigger" || type === "publish") {
		// what we do here is that if we know its just a wait node(or a schedule node)
		//all we need is to wait time and pass contact to the next step
		//So when time is on and this function is runned we start job for all connected steps or ending if for some reason this is the last one node
		const step = await getJourneyStep(stepId);
		if (!step.success || !step.responseObject) throw new Error(step.message);

		// Mark wait step as passed (no composition/channel needed for wait steps)
		await closeJob(jobId);

		if (step.responseObject.connections_from_this_step?.length) {
			for (const connection_step of step.responseObject
				.connections_from_this_step) {
				await createNextJob(
					{
						contactId,
						journeyId,
						stepId,
					},
					connection_step.target_step.documentId,
				);
				return;
			}
		} else {
			const scoreResp = await createContactActionAndScore(stepId, contactId);
			if (!scoreResp.success) throw new Error(scoreResp.message);
			await createNextJob(data, null);
			return;
		}
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
	if (!stepResp.success || !stepResp.responseObject)
		throw new Error(stepResp.message);

	if (stepResp.responseObject.connections_from_this_step?.length) {
		await createRuleCheckJob(data);
	} else {
		const scoreResp = await createContactActionAndScore(stepId, contactId);
		if (!scoreResp.success) throw new Error(scoreResp.message);
		await createNextJob(data, null);
	}
}
