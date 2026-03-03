import type { Asset } from "./common/asset";
import type { BaseFormType, BaseType, DocumentId } from "./common/base-type";
import type { Contact } from "./contact";
export interface ContactDocument extends BaseType {
	file: Asset;
	contact: Contact;
	type: string
}

export interface Form_ContactDocument extends BaseFormType {
	file: Asset;
	contact: DocumentId;
	type: string;
}
