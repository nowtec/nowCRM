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
