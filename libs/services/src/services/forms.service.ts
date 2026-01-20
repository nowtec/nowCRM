import { API_ROUTES_STRAPI } from "../api-routes/api-routes-strapi";
import { envServices } from "../env-config";
import type { Asset } from "../types/common/asset";
import type { DocumentId } from "../types/common/base-type";
import type { Form_FormEntity, FormEntity } from "../types/form";
import BaseService from "./common/base.service";
import {
	handleError,
	handleResponse,
	type StandardResponse,
} from "./common/response.service";

class FormsService extends BaseService<FormEntity, Form_FormEntity> {
	public constructor() {
		super(API_ROUTES_STRAPI.FORMS);
	}

	public async submit(
		payload: {
			formId: DocumentId;
			identifier: string;
			formData: Record<string, any>; // might include File[]
		},
		token: string,
	): Promise<{ success: boolean; message?: string }> {
		const url = new URL(
			`strapi/api/${API_ROUTES_STRAPI.FORM_SUBMIT}`,
			envServices.API_GATEWAY,
		);

		const formData = new FormData();
		formData.append("formId", payload.formId);
		formData.append("identifier", payload.identifier);

		for (const [key, value] of Object.entries(payload.formData)) {
			if (Array.isArray(value) && value[0] instanceof File) {
				for (const file of value) {
					formData.append(`files.${key}`, file); // file upload
					formData.append(`formData[${key}]`, file.name); // file name
				}
			} else {
				formData.append(`formData[${key}]`, value);
			}
		}

		try {
			const response = await fetch(url, {
				method: "POST",
				headers: this.getHeaders(false, token),
				body: formData,
			});

			return await handleResponse<{ success: boolean; message?: string }>(
				response,
			);
		} catch (error) {
			return handleError<{ success: boolean; message?: string }>(error);
		}
	}

	async uploadCoverOrLogo(
		files: any,
		formId: DocumentId,
		targetField: string,
		token: string,
	): Promise<StandardResponse<Asset[]>> {
		const url = new URL(
			`strapi/api/${API_ROUTES_STRAPI.UPLOAD}`,
			envServices.API_GATEWAY,
		);

		const formData = new FormData();
		for (let i = 0; i < files.length; i++) {
			formData.append("files", files[i]);
		}
		formData.append("ref", "api::form.form");
		formData.append("refId", String(formId));
		formData.append("field", targetField);
		try {
			const response = await fetch(url, {
				headers: this.getHeaders(false, token),
				cache: "no-store",
				method: "POST",
				body: formData,
			});
			return await handleResponse(response);
		} catch (error: any) {
			return handleError(error);
		}
	}

	async deleteCoverOrLogo(
		assetId: number,
		token: string,
	): Promise<StandardResponse<Asset[]>> {
		const url = new URL(
			`strapi/api/${API_ROUTES_STRAPI.UPLOAD}/files/${assetId}`,
			envServices.API_GATEWAY,
		);

		try {
			const response = await fetch(url, {
				headers: this.getHeaders(false, token),
				cache: "no-store",
				method: "DELETE",
			});
			return await handleResponse(response);
		} catch (error: any) {
			return handleError(error);
		}
	}

	async duplicate(
		formId: DocumentId,
		token: string,
	): Promise<StandardResponse<null>> {
		try {
			const url = new URL(
				`strapi/api/${API_ROUTES_STRAPI.FORM_DUPLICATE}`,
				envServices.API_GATEWAY,
			);

			const response = await fetch(url, {
				method: "POST",
				headers: this.getHeaders(true, token),
				body: JSON.stringify({ id: formId }),
			});
			return await handleResponse(response);
		} catch (error: any) {
			return handleError(error);
		}
	}
}

export const formsService = new FormsService();
