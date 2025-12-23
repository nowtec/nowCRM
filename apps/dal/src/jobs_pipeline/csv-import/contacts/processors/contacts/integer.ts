export function validateIntegerFields(contact: any) {
	const integerFields = ["zip"];

	for (const field of integerFields) {
		const value = contact[field];

		if (value === undefined || value === null) continue;

		const parsed = Number.parseInt(value, 10);

		if (Number.isNaN(parsed)) {
			console.warn(
				`validateIntegerFields: skipping invalid "${field}" value: "${value}"`,
			);
			delete contact[field];
			continue;
		}

		contact[field] = parsed;
	}

	return contact;
}
