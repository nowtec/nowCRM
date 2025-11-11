// contactsapp/lib/actions/forms/updateForm.ts
"use server";

import { auth } from "@/auth";

import { getFormBySlugOrId } from "./get-form";
import { CustomForm_FormItemEntity, DocumentId, Form_FormEntity, FormEntity, StrapiImageFormat } from "@nowcrm/services";
import { formItemsService, formsService, handleError, StandardResponse } from "@nowcrm/services/server";
export async function updateForm(
	formId: DocumentId,
	values: Partial<Form_FormEntity>,
	items?: CustomForm_FormItemEntity[],
): Promise<StandardResponse<FormEntity>> {
	const session = await auth();
	if (!session) {
		return { data: null, status: 403, success: false };
	}

	try {
		// Never pass media relations with the general update call
		const formOnly = { ...(values as any) };
		delete (formOnly as any).logo;
		delete (formOnly as any).cover;

		await formsService.update(formId, formOnly, session.jwt);

		const currentForm = await getFormBySlugOrId(formId, false);
		if (!currentForm.data || currentForm.data.length === 0) {
			return {
				data: null,
				status: 404,
				success: false,
				errorMessage: "Form not found",
			};
		}

		const existingItems = currentForm.data[0].form_items || [];
		const existingIds = existingItems.map((fi) => fi.documentId);
		const incomingIds = (items ?? []).filter((i) => i.documentId).map((i) => i.documentId!);
		const toDelete = existingIds.filter((eid) => !incomingIds.includes(eid));
		await Promise.all(toDelete.map((eid) => formsService.delete(eid, session.jwt)));

		if (items && items.length > 0) {
			await Promise.all(
				items.map(async (item) => {
					if (item.documentId) {
						await formItemsService.update(item.documentId, {
							name: item.name,
							type: item.type,
							label: item.label,
							options: item.options,
							rank: item.rank,
							required: item.required ?? false,
							hidden: item.hidden ?? false,
						},session.jwt);
					} else {
						const { ...form_item_fields } = item;
						await formItemsService.create({
							...form_item_fields,
							form: formId,
						},session.jwt);
					}
				}),
			);
		}

		const updated = await formsService.findOne(formId, session.jwt, {
			populate: ["form_items", "logo", "cover"],
		});

		return updated;
	} catch (error: any) {
		return handleError(error);
	}
}

export async function uploadCoverOrLogo(
	formData: FormData,
	targetField: "logo" | "cover",
): Promise<{ id: number; url: string }> {
	const session = await auth();
	if (!session) {
		return {
			id: -1,
			url: "placeholder.png",
		};
	}
	const files = formData.getAll("files") as File[];

	const formIdRaw = formData.get("formIdRaw");
	if (!formIdRaw) {
		throw new Error("uploadImage: missing formId in formData");
	}
	const formId = Number(formIdRaw);

	const result = await formsService.uploadCoverOrLogo(
		files,
		formId,
		targetField,
		session.jwt,
	);
	const assets = result.data;

	if (assets && assets.length > 0) {
		return { id: assets[0].id, url: assets[0].url };
	}
	return { id: -1, url: "placeholder.png" };
}

export async function eraseCoverOrLogo(
	strapiImage: StrapiImageFormat,
	targetField: string,
): Promise<string> {

	const session = await auth();
	if (!session) {
		return "Unauthorized";
	}
	if (!strapiImage || !strapiImage.id) {
		throw new Error("Invalid image format: missing id.");
	}

	const result = await formsService.deleteCoverOrLogo(Number(strapiImage.id), session.jwt);
	
	if (!result.success) {
		throw new Error(`Failed to delete image from field ${targetField}.`);
	}

	return `Image for ${targetField} deleted successfully.`;
}
