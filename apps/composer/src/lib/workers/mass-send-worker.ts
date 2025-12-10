import { Worker } from "bullmq";
import {
	fetchContactsFromList,
	fetchContactsFromOrganization,
} from "@/api/sendToChannels/channelFunctions/utils/channel-processor";
import { env } from "@/common/utils/env-config";
import { logger } from "@/server";
import { sendQueue } from "../queues/send-queue";

new Worker(
	"massSendQueue",
	async (job) => {
		const { data, composition } = job.data as {
			data: {
				to?: any;
				channels: string[];
				type?: string;
				interval?: number;
				[key: string]: any;
			};
			composition: any;
		};
		const { to, channels, type } = data;

		logger.info(
			`massSendWorker started. Type: "${type}", Contacts: ${Array.isArray(to) ? to.length : 0}, Channels: ${channels.join(", ")}`,
		);

		if (type === "list" || type === "organization") {
			try {
				const contactsRes =
					type === "list"
						? await fetchContactsFromList(to as string)
						: await fetchContactsFromOrganization(to as string);

				if (!contactsRes.success || !contactsRes.responseObject) {
					logger.error(`Failed to fetch contacts for ${type} ${to}`);
					return;
				}

				const contacts = contactsRes.responseObject;

				if (contacts.length === 0) {
					logger.warn(`No contacts found in ${type} ${to}`);
					return;
				}

				for (const [index, contact] of contacts.entries()) {
					const contactData = {
						...data,
						to: contact.documentId,
						type: "contact",
					};

					for (const channel of channels) {
						await sendQueue.add(
							"send",
							{
								channel,
								data: contactData,
								composition,
								parentJobId: job.id,
							},
							{
								delay: (data.interval ?? 0) * index,
							},
						);

						logger.info(
							`Job enqueued for ${type}=${to}: channel="${channel}", contactId=${contact.documentId}, delay=${(data.interval ?? 0) * index}`,
						);
					}
				}

				logger.info(
					`massSendWorker finished: enqueued ${contacts.length * channels.length} jobs for ${type} ${to}`,
				);
			} catch (err) {
				logger.error(
					`Error in massSendWorker for ${type} ${to}: ${(err as Error).message}`,
				);
			}
			return;
		}

		if (!data.type) {
			for (const channel of channels) {
				await sendQueue.add("send", {
					channel,
					data,
					composition,
					parentJobId: job.id,
				});
				logger.info(
					`Job enqueued directly for channel="${channel}", parentJobId=${job.id}`,
				);
			}
			return;
		}

		if (!Array.isArray(to) || to.length === 0) {
			logger.warn("No contacts received into massSendWorker");
			return;
		}
		for (const [index, contact] of to.entries()) {
			const contactData = { ...data, to: [contact] };

			for (const channel of channels) {
				await sendQueue.add(
					"send",
					{
						channel,
						data: contactData,
						composition,
						parentJobId: job.id,
					},
					{
						delay: (data.interval ?? 0) * index,
					},
				);

				logger.info(
					`Job sent to sendQueue: contact #${index + 1}, channel="${channel}", delay=${(data.interval ?? 0) * index}`,
				);
			}
		}

		logger.info(`massSendWorker finished. Total: ${to.length} contacts`);
	},
	{
		connection: {
			host: env.COMPOSER_REDIS_HOST,
			port: env.COMPOSER_REDIS_PORT,
		},
	},
);
