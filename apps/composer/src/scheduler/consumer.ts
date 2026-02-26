import type { CompositionScheduled, UnipileIdentity } from "@nowcrm/services";
import {
	compositionScheduledsService,
	identitiesService,
	unipileIdentitiesService,
} from "@nowcrm/services/server";
import amqp from "amqplib";
import { env } from "@/common/utils/env-config";
import { logger } from "@/logger";

const QUEUE_NAME = "delayed_composer_jobs";

async function processJob(job: {
	fetchedAt: string;
	payload: CompositionScheduled;
}): Promise<void> {
	logger.info(
		{
			jobFetchedAt: job.fetchedAt,
			scheduledId: job.payload.documentId,
			compositionId: job.payload.composition?.id,
			channel: job.payload.channel?.name,
			sendToType: job.payload.send_to?.type,
			sendToIdentityId: job.payload.send_to?.identity?.value,
			hasSendData: !!job.payload.send_to?.send_data,
		},
		"[Scheduler Consumer] Starting delayed composer job",
	);
	const identity = job.payload.send_to?.identity;
	let identity_mail: string | undefined;
	let identity_unipile: UnipileIdentity | undefined | null;
	const isLinkedInInvitations =
		job.payload.channel.name === "Linkedin_Invitations";
	if (identity) {
		logger.info(
			{
				identityId: identity.value,
				channel: job.payload.channel.name,
			},
			"[Scheduler Consumer] Fetching sender identity",
		);
		if (!isLinkedInInvitations) {
			identity_mail = (
				await identitiesService.findOne(
					identity.value,
					env.COMPOSER_STRAPI_API_TOKEN,
				)
			).data?.name;
			logger.info(
				{
					identityId: identity.value,
					identityEmail: identity_mail,
				},
				"[Scheduler Consumer] Email identity resolved",
			);
		} else {
			identity_unipile = (
				await unipileIdentitiesService.findOne(
					identity.value,
					env.COMPOSER_STRAPI_API_TOKEN,
				)
			).data;
			logger.info(
				{
					identityId: identity.value,
					unipileIdentityDocumentId: identity_unipile?.documentId,
					unipileIdentityName: identity_unipile?.name,
					unipileAccountId: identity_unipile?.account_id,
					unipileStatus: identity_unipile?.unipile_status,
				},
				"[Scheduler Consumer] Unipile identity resolved",
			);
		}
	} else {
		logger.warn(
			{
				channel: job.payload.channel.name,
				scheduledId: job.payload.documentId,
			},
			"[Scheduler Consumer] No identity configured on scheduled job",
		);
	}
	const send_data = job.payload.send_to
		? job.payload.send_to.send_data
		: undefined;
	let send_to: string | number | undefined;
	if (send_data) {
		send_to =
			typeof send_data === "object" ? parseInt(send_data.value, 10) : send_data;
	}
	const url = env.isProduction
		? `https://${env.COMPOSER_HOST}.${env.CUSTOMER_DOMAIN}/send-to-channels`
		: `http://${env.COMPOSER_HOST}:${env.COMPOSER_PORT}/send-to-channels`;
	const data = {
		composition_id: job.payload.composition.id,
		subject: job.payload.composition.subject,
		channels: [job.payload.channel.name.toLowerCase()],
		to: send_to,
		type: job.payload.send_to ? job.payload.send_to.type : undefined,
		from: identity_mail,
		//handling linkedin case
		account: identity_unipile,
	};
	logger.info(
		{
			url,
			payload: {
				composition_id: data.composition_id,
				channels: data.channels,
				to: data.to,
				type: data.type,
				from: data.from,
				hasAccount: !!data.account,
				unipileAccountId: data.account?.account_id,
			},
		},
		"[Scheduler Consumer] Dispatching send-to-channels request",
	);
	const response = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		cache: "no-store",
		body: JSON.stringify(data),
	});
	const responseText = await response.text().catch(() => "");
	const trimmedResponseText =
		responseText.length > 1000
			? `${responseText.slice(0, 1000)}...<trimmed>`
			: responseText;
	if (response.ok) {
		logger.info(
			{
				status: response.status,
				statusText: response.statusText,
				body: trimmedResponseText,
				scheduledId: job.payload.documentId,
			},
			"[Scheduler Consumer] send-to-channels request completed",
		);
	} else {
		logger.error(
			{
				status: response.status,
				statusText: response.statusText,
				body: trimmedResponseText,
				scheduledId: job.payload.documentId,
				compositionId: job.payload.composition.id,
			},
			"[Scheduler Consumer] send-to-channels request failed",
		);
	}
	logger.info(
		{
			scheduledId: job.payload.documentId,
		},
		"[Scheduler Consumer] Marking scheduled composition as published",
	);
	await compositionScheduledsService.update(
		job.payload.documentId,
		{ scheduled_status: "published" },
		env.COMPOSER_STRAPI_API_TOKEN,
	);
	logger.info(
		{
			scheduledId: job.payload.documentId,
		},
		"[Scheduler Consumer] Scheduled composition status updated",
	);
	return;
}

export async function startConsumer(): Promise<void> {
	const connection = await amqp.connect(env.RABBITMQ_URL);
	const channel = await connection.createChannel();
	await channel.assertQueue(QUEUE_NAME, { durable: true });

	console.log(`[Consumer] Waiting for jobs in "${QUEUE_NAME}"...`);

	channel.consume(
		QUEUE_NAME,
		async (msg) => {
			if (!msg) return;
			try {
				const job: any = JSON.parse(msg.content.toString());
				logger.info(`[Consumer] Received job`, job);
				await processJob(job);
				channel.ack(msg);
			} catch (err) {
				console.error("[Consumer] Job error:", err);
				channel.nack(msg, false, false);
			}
		},
		{ noAck: false },
	);
}
