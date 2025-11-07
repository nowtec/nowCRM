import { LanguageKeys } from "../static/languages";
import type { BaseFormType, BaseType } from "./common/base_type";
export interface TextBlock extends BaseType {
	text: string;
	locale: LanguageKeys;
}

export interface Form_TextBlock extends BaseFormType {
	text: string;
	locale: LanguageKeys;
}
