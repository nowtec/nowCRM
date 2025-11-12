// src/common/utils/fetch-json.ts
export async function fetchJson<T>(
	url: string,
	options: RequestInit & { timeout?: number } = {},
): Promise<T> {
	const { timeout = 30000, ...opts } = options;
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeout);

	try {
		const res = await fetch(url, { ...opts, signal: controller.signal });
		clearTimeout(timer);

		if (!res.ok) {
			const text = await res.text();
			throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`);
		}

		return (await res.json()) as T;
	} finally {
		clearTimeout(timer);
	}
}
