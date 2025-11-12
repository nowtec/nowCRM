// contactsapp/lib/actions/forms/getForm.ts

"use server";

import {
	checkDocumentId,
	type DocumentId,
	type FormEntity,
} from "@nowcrm/services";
import {
	formsService,
	handleError,
	type StandardResponse,
} from "@nowcrm/services/server";
import type { Session } from "next-auth";
import { env } from "@/lib/config/envConfig";

/**
 * Server action to fetch a form by its slug/ID
 * @param id The form ID or slug
 * @returns The form data or null if not found
 */
export async function getFormBySlugOrId(
	identifier: string | DocumentId,
	fromPublic: boolean = true,
	lengthOfResults: number = 1,
): Promise<StandardResponse<FormEntity[]>> {
	try {
		let session: Session | null = null;
		if (!fromPublic) {
			const { auth } = await import("@/auth");
			session = await auth();
			if (!session) {
				return {
					data: null,
					status: 403,
					success: false,
				};
			}
		}
		// 1. Build filters dynamically
		const isId = checkDocumentId(identifier);

		const filters = isId
			? { documentId: { $eq: identifier } }
			: { slug: { $eq: String(identifier) } };

		// 2. Fetch with the chosen filter
		const response = await formsService.find(
			session ? session.jwt : env.CRM_STRAPI_API_TOKEN,
			{
				filters,
				populate: ["form_items", "cover", "logo"],
				sort: ["id:desc"],
				pagination: { page: 1, pageSize: lengthOfResults },
			},
		);

		// 3. Sort form_items by rank if available
		if (response.success && response.data?.length) {
			response.data = response.data.map((form) => ({
				...form,
				form_items: (form.form_items || [])
					.slice()
					.sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0)),
			}));
		}

		return response;
	} catch (error: any) {
		return handleError(error);
	}
}

/**
 * Server action to submit form data
 * @param formData The form submission data
 * @returns Success status and message
 */
export async function submitFormData(formData: {
	formId: DocumentId | undefined;
	identifier: string;
	formData: Record<string, any>;
}): Promise<{ success: boolean; message?: string }> {
	try {
		return await formsService.submit(formData, env.CRM_STRAPI_API_TOKEN);
	} catch (error) {
		return handleError(error);
	}
}
