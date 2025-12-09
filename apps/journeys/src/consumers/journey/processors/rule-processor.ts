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
	logger.info(`Checking rules for job ${jobId}`);

	const stepResp = await getJourneyStep(stepId);
	if (!stepResp.success || !stepResp.responseObject)
		throw new Error(stepResp.message);

	const step = stepResp.responseObject;
	// no connections means its last step - close the job and finish
	if (!step.connections_from_this_step) {
		logger.info(
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
		// Check retry count to prevent infinite republishing
		// _retryMetadata is added by retry handler, check if it exists
		const retryMetadata = (data as any)._retryMetadata;
		const retryCount = retryMetadata?.["x-retry-count"] || 0;
		const maxRuleRetries = 10; // Max retries for rule checks (connections might take time to evaluate)

		if (retryCount >= maxRuleRetries) {
			logger.error(
				{
					jobId,
					contactId,
					stepId,
					retryCount,
					maxRuleRetries,
				},
				`Rule check exceeded max retries (${maxRuleRetries}), closing job and moving to next step`,
			);
			// Close the job and move to next step to prevent infinite loop
			await closeJob(jobId);
			// Try to get first connection as fallback
			const firstConnection = step.connections_from_this_step[0];
			if (firstConnection?.target_step?.documentId) {
				await createNextJob(data, firstConnection.target_step.documentId);
			}
			return; // Consumer will ack the message
		}

		logger.info(
			{ jobId, contactId, stepId, retryCount, maxRuleRetries },
			`Requeuing rule job ${jobId} after delay - connections not ready yet (retry ${retryCount + 1}/${maxRuleRetries})`,
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
