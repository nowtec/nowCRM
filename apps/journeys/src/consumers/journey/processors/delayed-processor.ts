import type { delayedProcessorJobData } from "@nowcrm/services";
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
		if (!step.success || !step.responseObject) throw new Error(step.message);

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
