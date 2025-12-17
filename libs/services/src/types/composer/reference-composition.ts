import type { aiModelKeys } from "../../static/ai-models";
import type { LanguageKeys } from "../../static/languages";
import type { DocumentId } from "../common/base-type";
import type { CompositionStatusKeys } from "../composition";

export interface ReferenceComposition {
	title?: string;
	subject?: string;
	composition_status?: CompositionStatusKeys;
	language?: LanguageKeys;
	mainChannel?: DocumentId;
	category?: string;
	promptBase?: string;
	persona?: string;
	model: aiModelKeys;
	prompt: string;
	replaceEsset?: boolean;
}
