import type { StrapiQuery } from "@nowcrm/services";
import { env } from "@/common/utils/env-config";

/**
 * Enforces pagination limits to prevent unbounded data fetching
 * @param options - Original Strapi query options
 * @returns Modified options with pagination limits enforced
 */
export function enforcePaginationLimits<T>(
	options?: StrapiQuery<T>,
): any {
	const maxPages = env.STRAPI_PAGINATION_MAX_PAGES;
	const maxRecords = env.STRAPI_PAGINATION_MAX_RECORDS;
	const defaultPageSize = 100;

	const modifiedOptions = options
		? JSON.parse(JSON.stringify(options))
		: ({} as StrapiQuery<T>);

	// Set or enforce page size
	const requestedPageSize =
		(modifiedOptions as any)?.pagination?.pageSize &&
		Number((modifiedOptions as any).pagination.pageSize) > 0
			? Number((modifiedOptions as any).pagination.pageSize)
			: defaultPageSize;

	// Calculate max page size based on max records
	const maxPageSize = Math.min(requestedPageSize, maxRecords);
	const effectivePageSize = Math.min(maxPageSize, defaultPageSize);

	// Enforce max pages limit
	const maxPage = Math.min(
		maxPages,
		Math.ceil(maxRecords / effectivePageSize),
	);

	(modifiedOptions as any).pagination = {
		...(modifiedOptions as any)?.pagination,
		pageSize: effectivePageSize,
		// If user requested a specific page, ensure it doesn't exceed max
		...(modifiedOptions as any)?.pagination?.page && {
			page: Math.min(
				Number((modifiedOptions as any).pagination.page),
				maxPage,
			),
		},
	};

	return modifiedOptions;
}

/**
 * Validates that pagination results don't exceed limits
 * @param data - Fetched data array
 * @param page - Current page number
 * @param pageSize - Page size
 * @throws Error if limits exceeded
 */
export function validatePaginationResults(
	data: any[],
	page: number,
	pageSize: number,
): void {
	const maxPages = env.STRAPI_PAGINATION_MAX_PAGES;
	const maxRecords = env.STRAPI_PAGINATION_MAX_RECORDS;

	if (page > maxPages) {
		throw new Error(
			`Pagination limit exceeded: page ${page} exceeds maximum of ${maxPages} pages`,
		);
	}

	if (data.length > maxRecords) {
		throw new Error(
			`Pagination limit exceeded: ${data.length} records exceeds maximum of ${maxRecords} records`,
		);
	}
}

