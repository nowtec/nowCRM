// Define a standardized response interface
export interface StandardResponse<T> {
	data: T | null;
	status: number;
	success: boolean;
	errorMessage?: string;
	meta?: {
		pagination: {
			page: number;
			pageSize: number;
			pageCount: number;
			total: number;
		};
	};
}

type GatewayErrorDetails = {
	http_status_code?: number;
	http_body?: string;
	http_body_encoding?: string;
};

export type GatewayError = {
	status: number;
	message: string;
};

// KrakenD's `return_error_details` alias, shared by every endpoint definition.
const GATEWAY_ERROR_KEY = "error_backend_status";

function extractGatewayErrorMessage(
	details: GatewayErrorDetails,
	fallbackMessage: string,
): string {
	const body = details.http_body;
	if (!body) {
		return fallbackMessage;
	}

	try {
		const parsed = JSON.parse(body);
		if (parsed?.error) {
			return `${parsed.error.status ?? ""} - ${parsed.error.message ?? "Unknown error"}`.trim();
		}
		if (typeof parsed?.message === "string") {
			return parsed.message;
		}
	} catch {
		// Upstream answered with a non-JSON body (plain text or HTML).
	}

	return body;
}

/**
 * Detects a gateway-wrapped upstream failure.
 *
 * KrakenD answers with HTTP 200 while nesting the real failure under
 * `error_backend_status`, so the envelope has to be detected from the body.
 *
 * @param body - The parsed response body.
 * @param fallbackStatus - Status to report when the envelope omits one.
 * @returns The upstream error, or `null` when the body is not an envelope.
 */
export function parseGatewayError(
	body: unknown,
	fallbackStatus: number,
): GatewayError | null {
	if (!body || typeof body !== "object") {
		return null;
	}

	const details = (body as Record<string, unknown>)[GATEWAY_ERROR_KEY] as
		| GatewayErrorDetails
		| undefined;

	if (!details || typeof details !== "object") {
		return null;
	}

	const status = details.http_status_code || fallbackStatus;

	return {
		status,
		message: extractGatewayErrorMessage(details, `Request failed (${status})`),
	};
}

function processItem(item: any): any {
	if (item === null || item === undefined) {
		return item;
	} else if (Array.isArray(item)) {
		return item.map(processItem);
	} else if (typeof item === "object") {
		if ("id" in item && "attributes" in item) {
			const { id, attributes } = item;
			return { id, ...processItem(attributes) };
		} else if ("data" in item) {
			return processItem(item.data);
		} else {
			const processedItem: any = {};
			for (const key in item) {
				processedItem[key] = processItem(item[key]);
			}
			return processedItem;
		}
	} else {
		return item;
	}
}

// Handle successful responses
export async function handleResponse<T>(
	response: Response,
): Promise<StandardResponse<T>> {
	const status = response.status;
	const success = response.ok;
	try {
		const json: any = await response.json();

		const gatewayError = parseGatewayError(json, status);
		if (gatewayError) {
			return {
				data: null,
				status: gatewayError.status,
				success: false,
				errorMessage: gatewayError.message,
			};
		}

		let data: T | null = null;
		let meta: any;
		let errorMessage: any;
		if (json.data) {
			data = processItem(json.data) as T;
			meta = json.meta;
		} else {
			data = processItem(json) as T;
		}
		if (json.error) {
			errorMessage = `${json.error.status} - ${json.error.message}`;
		}
		if (status === 500 || status === 400) {
			console.log(json);
		}
		return {
			data,
			status,
			success,
			meta,
			errorMessage,
		};
	} catch (_error) {
		return {
			data: null,
			status,
			success: false,
			errorMessage: "Failed to parse response JSON.",
		};
	}
}

// Handle errors
export function handleError<T>(error: any): StandardResponse<T> {
	return {
		data: null,
		status: error.status || 500,
		success: false,
		errorMessage: error.message || "An unknown error occurred.",
	};
}
