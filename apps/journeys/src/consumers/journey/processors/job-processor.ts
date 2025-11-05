import type { jobProcessorJobData } from "@nowcrm/services";
import {
	closeJob,
	createNextJob,
	createRuleCheckJob,
} from "../../../jobs/create-job";
import { addJourneyPassedStep } from "../../../lib/functions/addJourneyPassedStep";
import { getJourneyStep } from "../../../lib/functions/helpers/getJourneyStep";
import { processJob } from "../../../lib/functions/processJob";
import { createContactActionAndScore } from "../../../lib/functions/rules/createActionAndScore";
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
	logger.info(`Processing job ${jobId}`);

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

	const step = stepResp.responseObject;
	if (step.connections_from_this_step?.length) {
		await createRuleCheckJob(data);
	} else {
		const scoreResp = await createContactActionAndScore(stepId, contactId);
		if (!scoreResp.success) throw new Error(scoreResp.message);
		await createNextJob(data, null);
	}
}
