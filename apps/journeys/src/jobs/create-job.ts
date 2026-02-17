import type { DocumentId, JourneyTiming } from "@nowcrm/services";
import {
	removeJobKey,
	setJobKeyAtomic,
} from "../lib/functions/helpers/check-job-exists";
import { checkStepValid } from "../lib/functions/helpers/check-step-valid";
import { getJourneyStep } from "../lib/functions/helpers/get-journey-step";
import { passContactToNextStep } from "../lib/functions/pass-contact-to-next-step";
import { createFinishActions } from "../lib/functions/rules/create-finish-action";
import { logger } from "../logger";
import { publishToJourneyQueue } from "../rabbitmq";

export async function createJob(jobData: {
	contact: DocumentId;
	journey: DocumentId;
	type: string;
	journey_step: DocumentId;
	composition?: DocumentId;
	channel?: DocumentId;
	timing?: JourneyTiming;
	ignoreSubscription?: boolean;
	skipValidation?: boolean;
}) {
	const jobKey = `job-contact:${jobData.contact}-journey:${jobData.journey}-step:${jobData.journey_step}`;

	logger.debug(
		{
			jobKey,
			contactId: jobData.contact,
			journeyId: jobData.journey,
			stepId: jobData.journey_step,
			type: jobData.type,
			skipValidation: jobData.skipValidation,
		},
		"Creating job",
	);

	if (!jobData.skipValidation) {
		// Lightweight validation: only check step structure (composition for channel steps)
		// The "contact has passed step" check is done in journey-processor to avoid duplicate API calls
		const stepValidation = await checkStepValid(
			jobData.contact,
			jobData.journey,
			jobData.journey_step,
			// Pass step data if available to avoid refetching
			{
				type: jobData.type,
				composition: jobData.composition
					? { documentId: jobData.composition }
					: null,
			},
		);
		if (!stepValidation.valid) {
			logger.warn(
				{
					jobKey,
					contactId: jobData.contact,
					stepId: jobData.journey_step,
					reason: stepValidation.reason,
				},
				"Step is not valid for contact, skipping job creation",
			);
			return;
		}

		logger.debug(
			{ jobKey, contactId: jobData.contact, stepId: jobData.journey_step },
			"Step validation passed, attempting atomic job key creation",
		);

		// Atomically set job key - returns false if job already exists (race condition prevented)
		const wasSet = await setJobKeyAtomic(
			jobData.contact,
			jobData.journey,
			jobData.journey_step,
			jobData.type,
			jobData.timing,
		);
		if (!wasSet) {
			logger.debug(
				{
					jobKey,
					contactId: jobData.contact,
					stepId: jobData.journey_step,
				},
				"Job already exists (race condition prevented), skipping creation",
			);
			return;
		}

		logger.debug(
			{ jobKey, contactId: jobData.contact, stepId: jobData.journey_step },
			"Job key atomically created in Redis",
		);
	} else {
		logger.debug(
			{ jobKey },
			"Skipping validation, using atomic job key creation",
		);
		// For skipValidation cases, still use atomic operation but don't check step validity
		const wasSet = await setJobKeyAtomic(
			jobData.contact,
			jobData.journey,
			jobData.journey_step,
			jobData.type,
			jobData.timing,
		);
		if (!wasSet) {
			logger.debug(
				{
					jobKey,
					contactId: jobData.contact,
					stepId: jobData.journey_step,
				},
				"Job already exists (race condition prevented), skipping creation",
			);
			return;
		}
	}

	const jobDataRedis = {
		jobId: jobKey,
		contactId: jobData.contact,
		journeyId: jobData.journey,
		stepId: jobData.journey_step,
		type: jobData.type,
		compositionId: jobData.composition,
		channel: jobData.channel,
		createdAt: new Date().toISOString(),
		ruleCheck: false,
		timing: jobData.timing,
		ignoreSubscription: jobData.ignoreSubscription,
	};

	// "wait", "scheduler-trigger", and "publish" steps MUST have timing and go to DELAYED queue
	// "channel" steps can have timing (delayed send) or go directly to JOB queue
	const requiresTiming =
		jobData.type === "wait" ||
		jobData.type === "scheduler-trigger" ||
		jobData.type === "publish";

	if (requiresTiming && !jobData.timing?.value) {
		logger.error(
			{
				jobKey,
				contactId: jobData.contact,
				stepId: jobData.journey_step,
				type: jobData.type,
			},
			`Step type "${jobData.type}" requires timing but none was provided. Skipping job creation.`,
		);
		return;
	}

	let delay = 0;
	if (jobData.timing?.value) {
		if (jobData.timing.type === "delay") {
			delay = Number(jobData.timing.value) * 60 * 1000; // time on back is stored in minutes
		} else {
			delay = Math.max(
				0,
				new Date(String(jobData.timing.value)).getTime() - Date.now(),
			);
		}
		logger.debug(
			{
				jobKey,
				contactId: jobData.contact,
				stepId: jobData.journey_step,
				type: jobData.type,
				delay,
				delayMinutes: delay / (60 * 1000),
				timingType: jobData.timing.type,
				timingValue: jobData.timing.value,
			},
			"Publishing job to DELAYED queue",
		);
		try {
			await publishToJourneyQueue("DELAYED", jobDataRedis, delay);
			logger.debug(
				{
					jobKey,
					contactId: jobData.contact,
					stepId: jobData.journey_step,
					type: jobData.type,
					queue: "DELAYED",
				},
				"Job published to DELAYED queue",
			);
		} catch (publishError) {
			logger.error(
				{
					err: publishError,
					jobKey,
					contactId: jobData.contact,
					stepId: jobData.journey_step,
					type: jobData.type,
					queue: "DELAYED",
					delay,
				},
				"Failed to publish job to DELAYED queue",
			);
			throw publishError;
		}
	} else {
		// Only "channel" type steps should go to JOB queue (without timing)
		if (jobData.type !== "channel") {
			logger.error(
				{
					jobKey,
					contactId: jobData.contact,
					stepId: jobData.journey_step,
					type: jobData.type,
				},
				`Step type "${jobData.type}" without timing should not go to JOB queue. Only "channel" steps can go to JOB queue without timing.`,
			);
			return;
		}
		logger.debug(
			{
				jobKey,
				contactId: jobData.contact,
				stepId: jobData.journey_step,
				type: jobData.type,
			},
			"Publishing job to JOB queue",
		);
		try {
			await publishToJourneyQueue("JOB", jobDataRedis);
			logger.debug(
				{
					jobKey,
					contactId: jobData.contact,
					stepId: jobData.journey_step,
					type: jobData.type,
					queue: "JOB",
				},
				"Job published to JOB queue",
			);
		} catch (publishError) {
			logger.error(
				{
					err: publishError,
					jobKey,
					contactId: jobData.contact,
					stepId: jobData.journey_step,
					type: jobData.type,
					queue: "JOB",
				},
				"Failed to publish job to JOB queue",
			);
			throw publishError;
		}
	}

	logger.debug(
		{
			jobKey,
			contactId: jobData.contact,
			journeyId: jobData.journey,
			stepId: jobData.journey_step,
			type: jobData.type,
		},
		"New job created successfully",
	);
}

export async function createRuleCheckJob(jobDataRedis: any) {
	const ruleJobKey = `${jobDataRedis.jobId}-rule_check:true`;
	const newJobData = { ...jobDataRedis, ruleCheck: true, jobKey: ruleJobKey };

	await publishToJourneyQueue("RULE_CHECK", newJobData);
	logger.debug(`Rule check job created: ${ruleJobKey}`);
}

export async function closeJob(jobId: string) {
	logger.debug(`Job closed: ${jobId}`);

	const match = jobId.match(/^job-contact:(.+?)-journey:(.+?)-step:(.+)$/);
	if (match) {
		const [, contactId, journeyId, stepId] = match;
		await removeJobKey(contactId, journeyId, stepId);
		logger.debug(`Removed job key from Redis: ${jobId}`);
	} else {
		logger.warn(`Could not parse jobId to remove from Redis: ${jobId}`);
	}
}

export async function createNextJob(
	jobData: any,
	targetStep: DocumentId | null,
) {
	const { contactId, journeyId, stepId } = jobData;
	if (targetStep) {
		const nextResp = await getJourneyStep(targetStep);
		if (!nextResp.success || !nextResp.responseObject) {
			logger.error(
				{ contactId, journeyId, stepId, targetStep },
				"Failed to get next journey step in createNextJob, cannot proceed",
			);
			return;
		}

		const next = nextResp.responseObject;
		await passContactToNextStep(contactId, stepId, journeyId, targetStep);
		await createJob({
			contact: contactId,
			journey: journeyId,
			journey_step: next.documentId,
			type: next.type,
			composition: next.composition?.documentId || undefined,
			channel: next.channel?.documentId || undefined,
			timing: next.timing,
			skipValidation: true,
		});
	} else {
		//if no target step we assume that this is last step of journey
		// Remove contact from journey and create finish action
		await passContactToNextStep(contactId, stepId, journeyId, null);
		await createFinishActions(contactId, journeyId);
		logger.debug(
			{ contactId, journeyId, stepId },
			"Journey completed, contact removed from journey",
		);
	}
}
