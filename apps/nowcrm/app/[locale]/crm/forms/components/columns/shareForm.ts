// contactsapp/app/[locale]/crm/forms/components/columns/shareForm.ts
"use server";
import { env } from "@/lib/config/envConfig";
import { DocumentId } from "@nowcrm/services";

export async function shareForm(
	form_id: DocumentId,
	form_slug?: string | null,
): Promise<string> {
	// 1. Trim and check the slug
	const hasValidSlug = !!form_slug?.trim();

	// 2. Choose slug when valid, otherwise use the numeric id
	const slugOrId = hasValidSlug ? form_slug!.trim() : form_id.toString();

	// 3. Return the fully-qualified share URL
	return `${env.CRM_BASE_URL}/forms/share/${slugOrId}`;
}
