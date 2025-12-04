import type { DocumentId, JourneyTiming } from "@nowcrm/services";
import { getJourney } from "../lib/functions/helpers/get-jouney";
import { getJourneyStep } from "../lib/functions/helpers/get-journey-step";
import { passContactToNextStep } from "../lib/functions/pass-contact-to-next-step";
import { createFinishActions } from "../lib/functions/rules/create-finish-action";
import { logger } from "../logger";
import { publishToJourneyQueue } from "../rabbitmq";
import {
	checkJobExists,
	setJobKey,
	removeJobKey,
} from "../lib/functions/helpers/check-job-exists";
import { checkStepValid } from "../lib/functions/helpers/check-step-valid";

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

	if (!jobData.skipValidation) {
		const jobExists = await checkJobExists(
			jobData.contact,
			jobData.journey,
			jobData.journey_step,
		);
		if (jobExists) {
			logger.warn(
				`Job already exists, skipping creation: ${jobKey}`,
			);
			return;
		}

		const stepValidation = await checkStepValid(
			jobData.contact,
			jobData.journey,
			jobData.journey_step,
		);
		if (!stepValidation.valid) {
			logger.warn(
				`Step is not valid for contact, skipping job creation: ${jobKey}. Reason: ${stepValidation.reason}`,
			);
			return;
		}
	}

	await setJobKey(jobData.contact, jobData.journey, jobData.journey_step);

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
		publishToJourneyQueue("DELAYED", jobDataRedis, delay);
	} else {
		publishToJourneyQueue("JOB", jobDataRedis);
	}

	logger.info(`New job created: ${jobKey}`);
}

export async function createRuleCheckJob(jobDataRedis: any) {
	const ruleJobKey = `${jobDataRedis.jobId}-rule_check:true`;
	const newJobData = { ...jobDataRedis, ruleCheck: true, jobKey: ruleJobKey };

	publishToJourneyQueue("RULE_CHECK", newJobData);
	logger.info(`Rule check job created: ${ruleJobKey}`);
}

export async function closeJob(jobId: string) {
	logger.info(`Job closed: ${jobId}`);
	
	const match = jobId.match(/^job-contact:(.+?)-journey:(.+?)-step:(.+)$/);
	if (match) {
		const [, contactId, journeyId, stepId] = match;
		await removeJobKey(contactId, journeyId, stepId);
		logger.info(`Removed job key from Redis: ${jobId}`);
	} else {
		logger.warn(`Could not parse jobId to remove from Redis: ${jobId}`);
	}
}

export async function createNextJob(
	jobData: any,
	targetStep: DocumentId | null,
) {
	const { contactId, journeyId, stepId } = jobData;
	const journeyRes = await getJourney(journeyId);
	if (!journeyRes.success || !journeyRes.responseObject) return;

	if (targetStep) {
		const nextResp = await getJourneyStep(targetStep);
		if (!nextResp.success || !nextResp.responseObject) return;

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
		await passContactToNextStep(contactId, stepId, journeyId, null);
		await createFinishActions(contactId, journeyId);
	}
}
