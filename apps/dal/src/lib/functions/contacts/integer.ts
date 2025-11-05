export function validateIntegerFields(contact: any) {
	const integerFields = ["zip"];

	for (const field of integerFields) {
		const value = contact[field];

		if (value !== undefined) {
			const parsed = Number.parseInt(value, 10);

			if (Number.isNaN(parsed)) {
				throw new Error(
					`Field "${field}" must be an integer. Received: ${value}`,
				);
			}

			contact[field] = parsed;
		}
	}

	return true;
}
