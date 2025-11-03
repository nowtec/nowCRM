import type { CommunicationChannelKeys } from "static/communication-channel";
import type { BaseFormType, BaseType } from "./common/base_type";

export type EditorTextTypes = "text" | "html";
export type FileUploadTypes = "image" | "all" | "none";

export function getFileUploadMimeType(type: FileUploadTypes): string {
	return type === "image" ? "image/*" : "*";
}

export interface Channel extends BaseType {
	name: CommunicationChannelKeys;
	editor_text_type: EditorTextTypes;
	removeHtml: boolean;
	max_content_lenght: number;
	file_upload_types: FileUploadTypes;
	throttle: number;
	max_sending_quota: number;
	max_sending_rate: number;
}

export interface Form_Channel extends BaseFormType {
	name: CommunicationChannelKeys;
	editor_text_type: EditorTextTypes;
	removeHtml: boolean;
	max_content_lenght: number;
	file_upload_types: FileUploadTypes;
	throttle: number;
	max_sending_quota: number;
	max_sending_rate: number;
}
