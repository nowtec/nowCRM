import type { aiModelKeys } from "static/ai-models";
import type { LanguageKeys } from "static/languages";

export interface ReferenceComposition {
	title?: string;
	language?: LanguageKeys;
	mainChannel?: number;
	category?: string;
	promptBase?: string;
	persona?: string;
	model: aiModelKeys;
	prompt: string;
}
