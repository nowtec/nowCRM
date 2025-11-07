//contactsapp/lib/types/new_type/term.ts

import { BaseFormType, BaseType } from "./common/base_type";

export interface Term extends Omit<BaseType, "name"> {
	version?: string;
	title?: string;
	active?: boolean;
	text?: string;
}

export interface Form_Term extends Omit<BaseFormType, "name"> {
	version?: string;
	title?: string;
	active?: boolean;
	text?: string;
}
