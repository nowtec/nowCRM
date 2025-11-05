import {
	CommunicationChannel,
	type Composition,
	type DocumentId,
	ServiceResponse,
	type sendToChannelsData,
} from "@nowcrm/services";
import {
	compositionsService,
	listsService,
	organizationsService,
	type StandardResponse,
} from "@nowcrm/services/server";
import { StatusCodes } from "http-status-codes";
import qs from "qs";
import { env } from "@/common/utils/envConfig";
import { massSendQueue } from "@/lib/queues/SendQueue";
import { logger } from "@/server";
import { processEmailChannel } from "./channelFunctions/email/processEmail";
import { linkedinPost } from "./channelFunctions/linkedIn/createPost";
import { processSMSChannel } from "./channelFunctions/sms/processSMS";
import { telegramPost } from "./channelFunctions/telegram/createPost";
import { twitterPost } from "./channelFunctions/twitter/createPost";
import { processLinkedInInvitationsChannel } from "./channelFunctions/unipile/processLinkedinInvitations";
import { processWhatsAppChannel } from "./channelFunctions/whatsapp/processWhatsapp";
import { wordpressPost } from "./channelFunctions/wordpress/createPost";

export class SendToChannelsService {
	/**
	 * Send composition to specified channels
	 * @param data Data containing composition ID, channels, and recipient information
	 * @returns ServiceResponse with success or failure
	 */
	async sendToChannels(
		data: sendToChannelsData,
	): Promise<ServiceResponse<boolean | null>> {
		try {
			if (!data.title && typeof data.to === "number") {
				if (data.type === "list") {
					const list = await listsService.findOne(
						data.to,
						env.COMPOSER_STRAPI_API_TOKEN,
					);
					if (list.success && list.data?.name) {
						data.title = list.data.name;
					}
				}

				if (data.type === "organization") {
					const org = await organizationsService.findOne(
						data.to,
						env.COMPOSER_STRAPI_API_TOKEN,
					);

					if (org.success && org.data?.name) {
						data.title = org.data.name;
					}
				}
			}

			const composition = await this.getComposition(data.composition_id);
			if (!composition.success || !composition.data) {
				return ServiceResponse.failure(
					composition.errorMessage || "Failed to fetch composition",
					null,
					composition.status,
				);
			}

			if (data.searchMask) {
				const allIds = await this.fetchPage("contacts", data.searchMask);

				if (allIds.length === 0) {
					return ServiceResponse.success(
						"No contacts matched your filters",
						null,
					);
				}

				const massData = {
					...data,
					contacts: allIds,
					to: allIds,
				};

				await massSendQueue.add("massSend", {
					data: massData,
					composition: composition.data,
				});

				logger.info(` Queued mass send job with ${allIds.length} contacts`);
				return ServiceResponse.success(
					`Queued mass job with ${allIds.length} contacts`,
					null,
				);
			}

			if (
				data.type !== "contact" ||
				(typeof data.to !== "string" && typeof data.to !== "number")
			) {
				for (const channel of data.channels) {
					await massSendQueue.add("massSend", {
						data,
						composition: composition.data,
					});
					logger.info(`Job queued successfully for channel="${channel}"`);
				}
				return ServiceResponse.success("Mass job queued", null);
			}

			for (const channel of data.channels) {
				logger.info(`Processing channel: ${channel}`);
				switch (channel) {
					case CommunicationChannel.EMAIL.toLowerCase(): {
						const result = await processEmailChannel(
							data,
							composition.data as Composition,
						);
						if (!result.success) return result;
						break;
					}
					case CommunicationChannel.WHATSAPP.toLowerCase(): {
						const result = await processWhatsAppChannel(
							data,
							composition.data as Composition,
						);
						if (!result.success) return result;
						break;
					}
					case CommunicationChannel.SMS.toLowerCase(): {
						const result = await processSMSChannel(
							data,
							composition.data as Composition,
						);
						if (!result.success) return result;
						break;
					}
					case CommunicationChannel.TELEGRAM.toLowerCase(): {
						const composition_item = composition.data.composition_items.find(
							(item: any) =>
								item.channel.name.toLowerCase() ===
								CommunicationChannel.TELEGRAM.toLowerCase(),
						);
						if (!composition_item) {
							return ServiceResponse.failure(
								"No composition item found for telegram",
								null,
								StatusCodes.BAD_REQUEST,
							);
						}
						const result = await telegramPost(composition_item);

						if (!result.success) {
							return result;
						}
						break;
					}

					case CommunicationChannel.BLOG.toLowerCase(): {
						if (!data.subject) {
							return ServiceResponse.failure(
								"Subject is missing for blogpost",
								null,
								StatusCodes.BAD_REQUEST,
							);
						}

						const composition_item = composition.data.composition_items.find(
							(item: any) =>
								item.channel.name.toLowerCase() ===
								CommunicationChannel.BLOG.toLowerCase(),
						);

						if (!composition_item) {
							return ServiceResponse.failure(
								"No composition item found for wordpress",
								null,
								StatusCodes.BAD_REQUEST,
							);
						}
						const result = await wordpressPost(composition_item, data.subject);

						if (!result.success) {
							return result;
						}
						break;
					}

					case CommunicationChannel.TWITTER.toLowerCase(): {
						const composition_item = composition.data.composition_items.find(
							(item: any) =>
								item.channel.name.toLowerCase() ===
								CommunicationChannel.TWITTER.toLowerCase(),
						);

						if (!composition_item) {
							return ServiceResponse.failure(
								"No composition item found for twitter",
								null,
								StatusCodes.BAD_REQUEST,
							);
						}
						const result = await twitterPost(composition_item);

						if (!result.success) {
							return result;
						}
						break;
					}

					case CommunicationChannel.LINKEDIN.toLowerCase(): {
						const composition_item = composition.data.composition_items.find(
							(item: any) =>
								item.channel.name.toLowerCase() ===
								CommunicationChannel.LINKEDIN.toLowerCase(),
						);

						if (!composition_item) {
							return ServiceResponse.failure(
								"No composition item found for linked-in",
								null,
								StatusCodes.BAD_REQUEST,
							);
						}
						const result = await linkedinPost(composition_item);

						if (!result.success) {
							return result;
						}
						break;
					}

					case CommunicationChannel.LINKEDIN_INVTITATIONS.toLowerCase(): {
						const result = await processLinkedInInvitationsChannel(
							data,
							composition.data as Composition,
						);
						if (!result.success) {
							return result;
						}
						break;
					}

					default: {
						logger.error(`Unknown channel: ${channel}`);
						return ServiceResponse.failure(
							"Unknown channel in request",
							null,
							StatusCodes.BAD_REQUEST,
						);
					}
				}
			}

			return ServiceResponse.success("Messages sent successfully", null);
		} catch (ex) {
			const errorMessage = `Error sending messages to channels: ${(ex as Error).message}`;
			logger.error(errorMessage);
			return ServiceResponse.failure(
				errorMessage,
				null,
				StatusCodes.INTERNAL_SERVER_ERROR,
			);
		}
	}

	async fetchPage(
		entity: string,
		searchMask: Record<string, any>,
	): Promise<number[]> {
		const pageSize = 100;
		let page = 1;
		const allIds: number[] = [];

		while (true) {
			const query = qs.stringify(
				{
					filters: searchMask,
					pagination: { page, pageSize },
					populate: "*",
				},
				{ encodeValuesOnly: true },
			);
			const url = `${env.STRAPI_URL}${entity}?${query}`;

			const res = await fetch(url, {
				method: "GET",
				headers: {
					Authorization: `Bearer ${env.COMPOSER_STRAPI_API_TOKEN}`,
					"Content-Type": "application/json",
				},
			});

			if (!res.ok) {
				const text = await res.text().catch(() => res.statusText);
				logger.error(`[${entity}] fetchPage error (page ${page}): ${text}`);
				throw new Error(`Strapi fetch error: ${res.status} ${res.statusText}`);
			}

			const json = await res.json();
			const items = Array.isArray(json.data) ? json.data : [];
			if (items.length === 0) break;

			allIds.push(...items.map((item: any) => item.id));
			page++;
		}

		return allIds;
	}

	/**
	 * Fetch composition with related data
	 * @param compositionId ID of the composition to fetch
	 * @returns StandardResponse with composition data or error
	 */
	private async getComposition(
		compositionId: DocumentId,
	): Promise<StandardResponse<Composition>> {
		const composition = await compositionsService.findOne(
			compositionId,
			env.COMPOSER_STRAPI_API_TOKEN,
			{
				populate: {
					composition_items: {
						populate: {
							channel: true,
							attached_files: true,
						},
					},
				},
			},
		);
		if (!composition.data || !composition.success) {
			const errorMessage = `Failed to fetch composition data: ${composition.status} | ${composition.errorMessage}`;
			logger.error(errorMessage);
			return {
				data: null,
				success: false,
				status: composition.status || StatusCodes.INTERNAL_SERVER_ERROR,
				errorMessage,
			};
		}

		if (!Object.hasOwn(composition.data, "composition_items")) {
			const errorMessage =
				"Strapi token badly configured for Composer service (composition-items)";
			return {
				data: null,
				success: false,
				status: StatusCodes.PARTIAL_CONTENT,
				errorMessage,
			};
		}
		if (composition.data.composition_items.length > 0) {
			if (!Object.hasOwn(composition.data.composition_items[0], "channel")) {
				const errorMessage =
					"Strapi token badly configured for Composer service (channel)";
				return {
					data: null,
					success: false,
					status: StatusCodes.PARTIAL_CONTENT,
					errorMessage,
				};
			}

			if (
				!Object.hasOwn(composition.data.composition_items[0], "attached_files")
			) {
				const errorMessage =
					"Strapi token badly configured for Composer service (attached files problem)";
				return {
					data: null,
					success: false,
					status: StatusCodes.PARTIAL_CONTENT,
					errorMessage,
				};
			}
		}

		return composition;
	}
}

export const sendToChannelsService = new SendToChannelsService();
