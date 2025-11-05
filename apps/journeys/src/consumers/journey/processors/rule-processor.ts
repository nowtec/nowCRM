import type { ruleProcessorJobData } from "@nowcrm/services";
import { CHECK_JOB_TTL_SEC } from "../../../config";
import { closeJob, createNextJob } from "../../../jobs/create-job";
import { getJourneyStep } from "../../../lib/functions/helpers/getJourneyStep";
import { createContactActionAndScore } from "../../../lib/functions/rules/createActionAndScore";
import { processStepConnections } from "../../../lib/functions/rules/processConnections";
import { logger } from "../../../logger";
import { publishToJourneyQueue } from "../../../rabbitmq";

export async function processRuleMessage(data: ruleProcessorJobData) {
	const { jobId, contactId, stepId } = data;
	logger.info(`Checking rules for job ${jobId}`);

	const stepResp = await getJourneyStep(stepId);
	if (!stepResp.success || !stepResp.responseObject)
		throw new Error(stepResp.message);

	const step = stepResp.responseObject;
	// no connections means its last step so we can return a true here
	if (!step.connections_from_this_step) return;

	const connections = await processStepConnections(
		step.connections_from_this_step,
		contactId,
	);
	if (!connections.responseObject) {
		logger.info(`Requeuing rule job ${jobId} after delay`);
		publishToJourneyQueue("RULE_CHECK", data, CHECK_JOB_TTL_SEC * 1000);
		return;
	}

	const { total_score, score_items, target_step } = connections.responseObject;
	await createContactActionAndScore(
		stepId,
		contactId,
		total_score,
		score_items,
		target_step.documentId,
	);
	await closeJob(jobId);
	await createNextJob(data, target_step.documentId);
}
