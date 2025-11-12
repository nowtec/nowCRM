export function cleanEmptyStringsToNull(
	obj: Record<string, any>,
): Record<string, any> {
	const cleaned: Record<string, any> = {};

	for (const key in obj) {
		const value = obj[key];

		if (typeof value === "string") {
			const trimmed = value.trim();
			cleaned[key] = trimmed === "" ? null : trimmed;
		} else if (Array.isArray(value)) {
			cleaned[key] = value.map((item) =>
				typeof item === "string"
					? item.trim() === ""
						? null
						: item.trim()
					: item,
			);
		} else if (value && typeof value === "object") {
			cleaned[key] = cleanEmptyStringsToNull(value);
		} else {
			cleaned[key] = value;
		}
	}

	return cleaned;
}
