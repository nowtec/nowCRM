import type { aiModelKeys } from "static/ai-models";
import type { LanguageKeys } from "static/languages";

export interface structuredResponse {
	model: aiModelKeys;
	input_data: string;
	structure_scheme: string;
	language?: LanguageKeys;
}
