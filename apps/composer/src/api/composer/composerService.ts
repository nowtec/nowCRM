import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOpenAI } from "@langchain/openai";
import {
	CommunicationChannel,
	type CompositionItemsStatusKeys,
	type CompositionStatusKeys,
	type createAdditionalComposition,
	type createComposition,
	type DocumentId,
	type QuickWriteModel,
	type ReferenceComposition,
	ServiceResponse,
	type structuredResponse,
} from "@nowcrm/services";
import {
	channelsService,
	compositionItemsService,
	compositionsService,
} from "@nowcrm/services/server";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { env } from "@/common/utils/envConfig";
import { logger } from "@/server";
import {
	BASE_PROMPT,
	ENRICH_PROMPT,
	HTML_FORMAT_PROMPT,
	QUICK_TEXT_CREATE_PROMPT,
	REMOVE_HTML_PROMPT,
	REWRITE_PROMPT,
	SUMMARIZATION_PROMPT,
} from "./prompts";

// 1. Define a Zod schema (you can also build this dynamically)

const schema = z.object({
	email: z.string().email().optional(),
	first_name: z.string(),
	last_name: z.string().optional(),
	address_line1: z.string().optional(),
	address_line2: z.string().optional(),
	plz: z.string().optional(),
	zip: z.number().optional(),
	location: z.string().optional(),
	canton: z.string().optional(),
	country: z.string().optional(),
	last_access: z.any().optional(),
	language: z.string().optional(),
	function: z.string().optional(),
	phone: z.string().optional(),
	mobile_phone: z.string().optional(),
	salutation: z.any().optional(),
	title: z.any().optional(),
	gender: z.enum(["Male", "Female"]).optional().or(z.string().optional()),
	website_url: z.string().optional(),
	linkedin_url: z.string().optional(),
	facebook_url: z.string().optional(),
	twitter_url: z.string().optional(),
	birth_date: z.string().optional(),
	status: z.string().optional(),
	priority: z.string().optional(),
	description: z.string().optional(),
	unsubscribe_token: z.string().optional(),
});

export class ComposerServiceApi {
	/**
	 * Creates a GPT response based on a reference prompt.
	 */
	async CreateReference(
		referenceData: ReferenceComposition,
	): Promise<ServiceResponse<{ result: string } | null>> {
		try {
			if (!referenceData.model) {
				return ServiceResponse.failure(
					"No model specified",
					null,
					StatusCodes.BAD_REQUEST,
				);
			}
			if (!referenceData.prompt) {
				return ServiceResponse.failure(
					"No prompt specified",
					null,
					StatusCodes.BAD_REQUEST,
				);
			}

			const finalPrompt = `${referenceData.prompt}\n${HTML_FORMAT_PROMPT}`;
			const result = await this.invokeModel(referenceData.model, finalPrompt);
			return ServiceResponse.success("GPT response generated", { result });
		} catch (error: any) {
			logger.error(error);
			return ServiceResponse.failure(
				`${error.message}`,
				null,
				StatusCodes.INTERNAL_SERVER_ERROR,
			);
		}
	}

	/**
	 * Creates an additional GPT response based on an additional prompt.
	 */
	async CreateAdditionalResult(
		data: createAdditionalComposition,
	): Promise<ServiceResponse<{ result: string } | null>> {
		try {
			if (!data.model) {
				return ServiceResponse.failure(
					"No model specified",
					null,
					StatusCodes.BAD_REQUEST,
				);
			}
			if (!data.reference_result) {
				return ServiceResponse.failure(
					"No reference result provided",
					null,
					StatusCodes.BAD_REQUEST,
				);
			}
			if (!data.additional_prompt && !data.removeHtml) {
				return ServiceResponse.success("Used previous response", {
					result: data.reference_result as string,
				});
			}

			let prompt = BASE_PROMPT(data.reference_result, data.additional_prompt);
			if (data.removeHtml) {
				prompt += REMOVE_HTML_PROMPT;
			}
			if (data.reference_result.length > data.max_content_length) {
				prompt += SUMMARIZATION_PROMPT(
					data.reference_result,
					data.max_content_length,
				);
			} else {
				prompt += REWRITE_PROMPT(data.max_content_length);
			}

			let result = await this.invokeModel(data.model, prompt);
			// Remove end marker if model includes it
			const endIndex = result.indexOf("<<END>>");
			if (endIndex !== -1) {
				result = result.slice(0, endIndex).trim();
			}
			// Enforce character length
			if (result.length > data.max_content_length) {
				logger.warn("Model exceeded length. Applying smart trim.");
				const safeIndex = result.lastIndexOf(".", data.max_content_length);
				result = result
					.slice(0, safeIndex > 50 ? safeIndex + 1 : data.max_content_length)
					.trim();
				result += " (Content shortened)";
			}
			return ServiceResponse.success("GPT response generated", { result });
		} catch (error: any) {
			logger.error(error);
			return ServiceResponse.failure(
				`${error.message}`,
				null,
				StatusCodes.INTERNAL_SERVER_ERROR,
			);
		}
	}

	/**
	 * Creates a new composition and processes associated composition items.
	 */
	async createComposition(
		data: createComposition,
	): Promise<ServiceResponse<{ id: DocumentId } | null>> {
		if (!data.name) {
			return ServiceResponse.failure(
				"No name specified",
				null,
				StatusCodes.BAD_REQUEST,
			);
		}
		if (!data.reference_result) {
			return ServiceResponse.failure(
				"No reference result provided",
				null,
				StatusCodes.BAD_REQUEST,
			);
		}
		const initialData = {
			name: data.name,
			subject: data.subject,
			category: data.category,
			language: data.language,
			persona: data.persona,
			model: data.model,
			reference_prompt: data.reference_prompt,
			reference_result: data.reference_result,
			add_unsubscribe: data?.add_unsubscribe,
			composition_status: "Pending" as CompositionStatusKeys, // Pending status indicates that composition items will be processed
		};

		const composition = await compositionsService.create(
			{
				...initialData,
				publishedAt: new Date(),
			},
			env.COMPOSER_STRAPI_API_TOKEN,
		);

		if (!composition.data || !composition.success) {
			return ServiceResponse.failure(
				"Composition wasn't created, probably Strapi is down",
				null,
				StatusCodes.INTERNAL_SERVER_ERROR,
			);
		}

		const compositionItemsIds: string[] = [];

		const channelName = await channelsService.findOne(
			data.mainChannel,
			env.COMPOSER_STRAPI_API_TOKEN,
		);
		let status: CompositionItemsStatusKeys = "Not published";
		if (
			channelName.data?.name.toLowerCase() ===
				CommunicationChannel.EMAIL.toLowerCase() ||
			channelName.data?.name.toLowerCase() ===
				CommunicationChannel.WHATSAPP.toLowerCase() ||
			channelName.data?.name.toLowerCase() ===
				CommunicationChannel.SMS.toLowerCase() ||
			channelName.data?.name.toLowerCase() ===
				CommunicationChannel.LINKEDIN_INVTITATIONS.toLowerCase()
		) {
			status = "None";
		}

		const mainChannelItem = await compositionItemsService.create(
			{
				channel: data.mainChannel,
				composition: composition.data.documentId,
				additional_prompt: data.reference_prompt as string,
				result: data.reference_result,
				item_status: status,
				publishedAt: new Date(),
			},
			env.COMPOSER_STRAPI_API_TOKEN,
		);
		if (!mainChannelItem.data || !mainChannelItem.success) {
			return ServiceResponse.failure(
				"main Channel Item wasn't created, probably Strapi is down",
				null,
				StatusCodes.INTERNAL_SERVER_ERROR,
			);
		}

		compositionItemsIds.push(mainChannelItem.data.documentId);
		if (data.composition_items?.length && data.composition_items.length) {
			for (const item of data.composition_items) {
				const channel = await channelsService.findOne(
					item.channel,
					env.COMPOSER_STRAPI_API_TOKEN,
				);
				const resultResponse = await this.CreateAdditionalResult({
					model: data.model,
					reference_result: data.reference_result,
					additional_prompt: item.additional_prompt,
					removeHtml: !!channel.data?.removeHtml,
					max_content_length: channel.data?.max_content_lenght || 50000,
				});
				// Check if the composition is still valid (although the check might be redundant here)
				if (!composition.data || !composition.success) {
					return ServiceResponse.failure(
						"Composition wasn't created, probably Strapi is down",
						null,
						StatusCodes.INTERNAL_SERVER_ERROR,
					);
				}

				let status: CompositionItemsStatusKeys = "Not published";
				if (
					channel.data?.name.toLowerCase() ===
						CommunicationChannel.EMAIL.toLowerCase() ||
					channel.data?.name.toLowerCase() ===
						CommunicationChannel.WHATSAPP.toLowerCase() ||
					channel.data?.name.toLowerCase() ===
						CommunicationChannel.SMS.toLowerCase() ||
					channel.data?.name.toLowerCase() ===
						CommunicationChannel.LINKEDIN_INVTITATIONS.toLowerCase()
				) {
					status = "None";
				}

				const itemResponse = await compositionItemsService.create(
					{
						channel: item.channel,
						composition: composition.data.documentId,
						additional_prompt: item.additional_prompt,
						result: resultResponse.responseObject?.result as string,
						item_status: status,
						publishedAt: new Date(),
					},
					env.COMPOSER_STRAPI_API_TOKEN,
				);

				if (!itemResponse.data || !itemResponse.success) {
					return ServiceResponse.failure(
						"Composition item wasn't created, probably Strapi is down",
						null,
						StatusCodes.INTERNAL_SERVER_ERROR,
					);
				}

				compositionItemsIds.push(itemResponse.data.documentId);
			}
		}

		await compositionsService.update(
			composition.data.documentId,
			{
				composition_items: { connect: compositionItemsIds },
				composition_status: "Finished" as CompositionStatusKeys,
			},
			env.COMPOSER_STRAPI_API_TOKEN,
		);
		return ServiceResponse.success("Composition created successfully", {
			id: composition.data.documentId,
		});
	}

	/**
	 * Quickly generates a text result from a prompt using the specified model.
	 */
	async QuickGenerate(
		data: QuickWriteModel,
	): Promise<ServiceResponse<{ result: string } | null>> {
		const { model, title, style, language, additional_context, target_length } =
			data;
		try {
			if (!model) {
				return ServiceResponse.failure(
					"No model specified",
					null,
					StatusCodes.BAD_REQUEST,
				);
			}
			if (!title) {
				return ServiceResponse.failure(
					"No title for writing is specified",
					null,
					StatusCodes.BAD_REQUEST,
				);
			}

			const prompt = QUICK_TEXT_CREATE_PROMPT(
				title,
				style,
				language,
				additional_context,
				target_length,
			);

			const result = await this.invokeModel(model, prompt);

			return ServiceResponse.success("Quick text generated", { result });
		} catch (error: any) {
			logger.error(error);
			return ServiceResponse.failure(
				`${error.message}`,
				null,
				StatusCodes.INTERNAL_SERVER_ERROR,
			);
		}
	}

	async GetStructuredResponse(
		data: structuredResponse,
	): Promise<ServiceResponse<{ result: any } | null>> {
		const { model, language, input_data, structure_scheme } = data;
		try {
			if (!model) {
				return ServiceResponse.failure(
					"No model specified",
					null,
					StatusCodes.BAD_REQUEST,
				);
			}
			if (!input_data) {
				return ServiceResponse.failure(
					"No input data provided",
					null,
					StatusCodes.BAD_REQUEST,
				);
			}

			if (!structure_scheme) {
				return ServiceResponse.failure(
					"No structured response schema provided",
					null,
					StatusCodes.BAD_REQUEST,
				);
			}

			const prompt = ENRICH_PROMPT(input_data, structure_scheme, language);

			console.warn("[Debug] prompt");
			console.warn(prompt);

			const result = await this.invokeModelStructuredDynamic(
				model,
				prompt,
				structure_scheme,
			);

			return ServiceResponse.success("Missing Fields obtained", { result });
		} catch (error: any) {
			logger.error(error);
			return ServiceResponse.failure(
				`${error.message}`,
				null,
				StatusCodes.INTERNAL_SERVER_ERROR,
			);
		}
	}

	/**
	 * Helper method to instantiate the correct model based on the provided model name and prompt.
	 * Throws an error if an invalid model is specified.
	 */
	private async invokeModel(
		modelName: string,
		prompt: string,
	): Promise<string> {
		let result: string;

		switch (modelName) {
			case "gpt-4o-mini": {
				const model = new ChatOpenAI({
					model: "gpt-4o-mini",
					temperature: 0,
					maxTokens: undefined,
					apiKey: env.COMPOSER_OPENAI_API_KEY,
				});
				result = (await model.invoke(prompt)).content as string;
				break;
			}
			case "claude": {
				const model = new ChatAnthropic({
					model: "claude-sonnet-4-20250514",
					temperature: 0,
					maxTokens: undefined,
					maxRetries: 2,
					apiKey: env.COMPOSER_ANTHROPIC_KEY,
				});
				result = (await model.invoke(prompt)).content as string;
				break;
			}
			default:
				throw new Error("Invalid model specified");
		}

		return result;
	}

	private async invokeModelStructuredDynamic(
		modelName: string,
		prompt: string,
		_className?: string,
	): Promise<any> {
		let structuredModel: any;

		switch (modelName) {
			case "gpt-4o-mini": {
				const model = new ChatOpenAI({
					model: "gpt-4o-mini",
					temperature: 0,
					apiKey: env.COMPOSER_OPENAI_API_KEY,
				});
				// 2. Bind schema using withStructuredOutput()
				structuredModel = model.withStructuredOutput(schema, {
					name: "ContactModel",
					method: "json_mode", // ensures JSON formatting (optional; default if tool-calling)
				});
				break;
			}
			case "claude": {
				const model = new ChatAnthropic({
					model: "claude-sonnet-4-20250514",
					temperature: 0,
					apiKey: env.COMPOSER_ANTHROPIC_KEY,
				});
				structuredModel = model.withStructuredOutput(schema, {
					name: "ContactModel",
				});
				break;
			}
			default:
				throw new Error(`Invalid model specified: ${modelName}`);
		}

		// 3. Invoke and obtain a structured object that matches the schema
		const result = await structuredModel.invoke(prompt);
		console.log("[LLM] structured output");
		console.log(result);
		return result;
	}
}

export const composerServiceApi = new ComposerServiceApi();
