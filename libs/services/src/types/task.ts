import type { BaseFormType, BaseType, DocumentId } from "./common/base_type";
import type { Contact } from "./contact";
import type { User } from "./user";

export type taskStatuses = "planned" | "in progress" | "done" | "expired";

export interface Task extends BaseType {
	due_data: Date;
	assigned_to: User;
	description: string;
	contact: Contact;
	action: string;
	task_status: taskStatuses;
}

export interface Form_Task extends BaseFormType {
	due_data: Date;
	assigned_to?: number; // users plugin still uses number id atm
	description: string;
	contact?: DocumentId;
	action: string;
	task_status: taskStatuses;
}
