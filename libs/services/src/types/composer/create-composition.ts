import type { aiModelKeys } from "static/ai-models";
import type { LanguageKeys } from "static/languages";
import type { DocumentId } from "types/common/base_type";
import type { CompositionStatusKeys } from "types/composition";

export interface createComposition {
	name: string;
	subject: string;
	category: string;
	language: LanguageKeys;
	mainChannel: DocumentId;
	persona: string;
	status: CompositionStatusKeys;
	model: aiModelKeys;
	reference_prompt: string;
	reference_result: string;
	add_unsubscribe: boolean;
	composition_items?: {
		additional_prompt: string;
		channel: DocumentId;
	}[];
}
