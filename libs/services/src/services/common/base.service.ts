// src/services/baseService.ts
import qs from "qs";
import { envServices } from "../../envConfig";
import type { DocumentId } from "../../types/common/base_type";
import type { StrapiQuery } from "../../types/common/StrapiQuery";
import type { StandardResponse } from "./response.service";
import { handleError, handleResponse } from "./response.service";

/**
 * Generic base service to handle common CRUD operations.
 * @template T - The type of the data entity.
 * @template FormT - The type of the form data used for creating/updating.
 */
class BaseService<T, FormT> {
	protected constructor(protected endpoint: string) {}

	/**
	 * Generates headers for HTTP requests.
	 * @param {boolean} contentType - Whether to include the Content-Type header.
	 * @param {string} [token] - Optional JWT token for authorization.
	 * @returns {Headers} - The headers object.
	 */
	protected getHeaders(contentType = false, token?: string): Headers {
		if (!token) {
			throw new Error("Authorization token is required.");
		}

		const headers = new Headers({
			Authorization: `Bearer ${token}`,
		});

		if (contentType) {
			headers.append("Content-Type", "application/json");
		}

		return headers;
	}

	/**
	 * Fetches a list of entities based on provided query options.
	 * @param {string} [token] - Api token for request
	 * @param {StrapiQuery} [options] - Query parameters for filtering, sorting, pagination, etc.
	 * @param {RequestInit} [fetchOptions] - params for fetch
	 * @returns {Promise<StandardResponse<T[]>>} - The standard response containing an array of entities.
	 */
	async find(
		token: string,
		options?: StrapiQuery<T>,
		fetchOptions?: RequestInit & { next?: any },
	): Promise<StandardResponse<T[]>> {
		const query = qs.stringify(options, { encodeValuesOnly: true });
		const url = new URL(`${this.endpoint}?${query}`, envServices.STRAPI_URL);
		try {
			const response = await fetch(url, {
				...fetchOptions,
				headers: this.getHeaders(false, token),
			});
			return await handleResponse<T[]>(response);
		} catch (error: any) {
			return handleError<T[]>(error);
		}
	}

	/**
	 * Return a count of total entities.
	 * @param {string} [token] - Api token for request
	 * @param {StrapiQuery} [options] - Query parameters for filtering, sorting, pagination, etc.
	 *  * @param {RequestInit} [fetchOptions] - params for fetch
	 * @returns {number} - number of found entities
	 */

	async count(
		token: string,
		options?: StrapiQuery<T>,
		fetchOptions?: RequestInit & { next?: any },
	): Promise<StandardResponse<number>> {
		const query = qs.stringify(options, { encodeValuesOnly: true });
		const url = new URL(`${this.endpoint}?${query}`, envServices.STRAPI_URL);
		try {
			const response = await fetch(url, {
				...fetchOptions,
				headers: this.getHeaders(false, token),
			});
			const json: any = await response.json();
			return {
				data: json.meta.pagination.total,
				success: true,
				status: 200,
				errorMessage: "",
				meta: json.meta,
			};
		} catch (error: any) {
			return handleError<number>(error);
		}
	}

	/**
	 * Return a count of total entities.
	 * @param {string} [token] - Api token for request
	 * @param {StrapiQuery} [options] - Query parameters for filtering, sorting, pagination, etc.
	 * @param {RequestInit} [fetchOptions] - params for fetch
	 * @returns {Promise<StandardResponse<T[]>>} - The standard response containing an array of entities.
	 */

	async findAll(
		token: string,
		options?: StrapiQuery<T>,
		fetchOptions?: RequestInit & { next?: any },
	): Promise<StandardResponse<T[]>> {
		const baseOptions: StrapiQuery<T> = options
			? JSON.parse(JSON.stringify(options))
			: ({} as any);
		const pageSize =
			(baseOptions as any)?.pagination?.pageSize &&
			Number((baseOptions as any).pagination.pageSize) > 0
				? Number((baseOptions as any).pagination.pageSize)
				: 100;

		let page = 1;
		let pageCount: number | undefined;
		let total: number | undefined;

		const allData: T[] = [];
		let lastStatus = 200;

		try {
			for (;;) {
				const query = qs.stringify(
					{
						...baseOptions,
						pagination: {
							...(baseOptions as any)?.pagination,
							page,
							pageSize,
						},
					},
					{ encodeValuesOnly: true },
				);

				const url = new URL(
					`${this.endpoint}?${query}`,
					envServices.STRAPI_URL,
				);
				const resp = await fetch(url, {
					...fetchOptions,
					headers: this.getHeaders(false, token),
				});

				const handled = await handleResponse<T[]>(resp);
				lastStatus = handled.status;

				if (!handled.success) return handled;

				if (Array.isArray(handled.data)) {
					allData.push(...handled.data);
				}

				const meta = handled.meta as
					| {
							pagination?: {
								page?: number;
								pageSize?: number;
								pageCount?: number;
								total?: number;
							};
					  }
					| undefined;

				if (!meta?.pagination) {
					if (!handled.data || handled.data.length < pageSize) break;
					if (page > 10_000) break;
					page += 1;
					continue;
				}

				if (page === 1) {
					pageCount = Number(meta.pagination.pageCount ?? NaN);
					total = Number(meta.pagination.total ?? NaN);
				}

				const reachedLastByCount =
					typeof pageCount === "number" && page >= pageCount;
				const reachedLastByData =
					!handled.data || handled.data.length < pageSize;

				if (reachedLastByCount || reachedLastByData) break;

				page += 1;
			}

			const finalMeta: any = {
				pagination: {
					page: 1,
					pageSize,
					pageCount:
						pageCount ??
						(allData.length > 0 ? Math.ceil(allData.length / pageSize) : 1),
					total: total ?? allData.length,
				},
			};

			return {
				data: allData,
				status: lastStatus,
				success: true,
				meta: finalMeta,
			};
		} catch (error: any) {
			return handleError<T[]>(error);
		}
	}

	/**
	 * Fetches a single entity by its ID with populated relations.
	 * @param {DocumentId} id - The unique identifier of the entity.
	 *  @param {string} [token] - Api token for request
	 * @param {StrapiQuery} [options] - Query parameters for filtering, sorting, pagination, etc.
	 * @returns {Promise<StandardResponse<T>>} - The standard response containing the entity details.
	 */
	async findOne(
		id: DocumentId,
		token: string,
		options?: StrapiQuery<T>,
	): Promise<StandardResponse<T>> {
		const query = qs.stringify(options, { encodeValuesOnly: true });
		const url = new URL(
			`${this.endpoint}/${id}?${query}`,
			envServices.STRAPI_URL,
		);

		try {
			const response = await fetch(url, {
				headers: this.getHeaders(false, token),
			});
			return await handleResponse<T>(response);
		} catch (error: any) {
			return handleError<T>(error);
		}
	}

	/**
	 * Deletes an entity by its ID.
	 * @param {DocumentId} id - The unique identifier of the entity to delete.
	 * @param {string} [token] - Api token for request
	 * @returns {Promise<StandardResponse<null>>} - The standard response indicating success or failure.
	 */
	async delete(id: DocumentId, token: string): Promise<StandardResponse<null>> {
		const url = new URL(`${this.endpoint}/${id}`, envServices.STRAPI_URL);
		try {
			const response = await fetch(url, {
				method: "DELETE",
				headers: this.getHeaders(false, token),
			});
			if (response.ok) {
				return {
					data: null,
					status: response.status,
					success: true,
				};
			}
			return await handleResponse<null>(response);
		} catch (error: any) {
			return handleError<null>(error);
		}
	}

	/**
	 * Creates a new entity.
	 * @param {FormT} form - The form data to create the entity.
	 * @param {string} [token] - Api token for request
	 * @returns {Promise<StandardResponse<T>>} - The standard response containing the created entity.
	 */
	async create(
		form: Partial<FormT>,
		token: string,
	): Promise<StandardResponse<T>> {
		const url = new URL(`${this.endpoint}`, envServices.STRAPI_URL);

		try {
			const response = await fetch(url, {
				method: "POST",
				headers: this.getHeaders(true, token),
				body: JSON.stringify({ data: form }),
			});
			return await handleResponse<T>(response);
		} catch (error: any) {
			return handleError<T>(error);
		}
	}

	/**
	 * Updates an existing entity by its ID.
	 * @param {number} id - The unique identifier of the entity to update.
	 * @param {Partial<FormT>} form - The updated form data.
	 * @param {string} [token] - Api token for request
	 * @param {boolean} [falseData] - this needed only for users service cause it automaticly wraps your data
	 * @returns {Promise<StandardResponse<T>>} - The standard response containing the updated entity.
	 */
	async update(
		id: DocumentId,
		form: Partial<FormT>,
		token: string,
		falseData?: boolean,
	): Promise<StandardResponse<T>> {
		const url = new URL(`${this.endpoint}/${id}`, envServices.STRAPI_URL);

		try {
			const response = await fetch(url, {
				method: "PUT",
				headers: this.getHeaders(true, token),
				body: falseData ? JSON.stringify(form) : JSON.stringify({ data: form }),
			});

			return await handleResponse<T>(response);
		} catch (error: any) {
			return handleError<T>(error);
		}
	}

	/**
	 * Returns the type of the item.
	 * @returns {string} - The type of the item.
	 */
	getItemType(): string {
		return typeof ({} as T);
	}
}

export default BaseService;
