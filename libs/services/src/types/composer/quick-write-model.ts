import type { aiModelKeys } from "static/ai-models";
import type { LanguageKeys } from "static/languages";

export interface QuickWriteModel {
	model: aiModelKeys;
	title: string;
	language?: LanguageKeys;
	style?: string;
	additional_context?: string;
	target_length?: string;
	persona?: string;
}
