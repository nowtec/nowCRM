import type { ruleProcessorJobData } from "@nowcrm/services";
import { CHECK_JOB_TTL_SEC } from "../../../config";
import { closeJob, createNextJob } from "../../../jobs/create-job";
import { getJourneyStep } from "../../../lib/functions/helpers/get-journey-step";
import { createContactActionAndScore } from "../../../lib/functions/rules/create-action-and-score";
import { processStepConnections } from "../../../lib/functions/rules/process-connections";
import { logger } from "../../../logger";
import { publishToJourneyQueue } from "../../../rabbitmq";

export async function processRuleMessage(data: ruleProcessorJobData) {
	const { jobId, contactId, stepId } = data;
	logger.debug(`Checking rules for job ${jobId}`);

	const stepResp = await getJourneyStep(stepId);
	if (!stepResp.success || !stepResp.responseObject)
		throw new Error(stepResp.message);

	const step = stepResp.responseObject;
	// no connections means its last step - close the job and finish
	if (!step.connections_from_this_step) {
		logger.debug(
			{ jobId, contactId, stepId },
			"Rule check: no connections from step, journey completed",
		);
		await closeJob(jobId);
		return; // Consumer will ack the message
	}

	const connections = await processStepConnections(
		step.connections_from_this_step,
		contactId,
	);
	if (!connections.responseObject) {
		// No rules passed - republish to wait until rules are completed
		// No retry limit - will keep retrying until rules pass
		logger.debug(
			{ jobId, contactId, stepId },
			`No rules passed for job ${jobId}, requeuing after delay to wait for rules completion`,
		);
		// Republish to RULE_CHECK queue with delay - consumer will ack original message
		await publishToJourneyQueue("RULE_CHECK", data, CHECK_JOB_TTL_SEC * 1000);
		return; // Consumer will ack the message after successful republish
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
