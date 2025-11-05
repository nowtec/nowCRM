export function formatDateTimeFields(contact: any): any {
	const datetimeFields = ["last_access", "account_created_at"];

	for (const field of datetimeFields) {
		const raw = contact[field];

		if (raw !== undefined && raw !== null) {
			const parsedDate = tryParseDateTime(raw);
			if (parsedDate) {
				contact[field] = parsedDate.toISOString();
			} else {
				throw new Error(
					`Field "${field}" must be a valid datetime string. Received: ${raw}`,
				);
			}
		}
	}

	return contact;
}

function tryParseDateTime(input: any): Date | null {
	if (input instanceof Date && !Number.isNaN(input.getTime())) {
		return input;
	}

	if (typeof input !== "string") return null;

	const cleanedInput = input
		.trim()
		.replace(/(\d{2})\.(\d{2})\.(\d{2,4})/, (_, d, m, y) => {
			const fullYear = y.length === 2 ? `20${y}` : y;
			return `${fullYear}-${m}-${d}`;
		})
		.replace(/[./]/g, "-");

	const date = new Date(cleanedInput);

	if (!Number.isNaN(date.getTime())) {
		return date;
	}

	return null;
}
