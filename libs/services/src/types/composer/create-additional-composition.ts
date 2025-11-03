import type { aiModelKeys } from "static/ai-models";

export interface createAdditionalComposition {
	model: aiModelKeys;
	reference_result: string;
	additional_prompt?: string;
	removeHtml: boolean;
	max_content_length: number;
}
