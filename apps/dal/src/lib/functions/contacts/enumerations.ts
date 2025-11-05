const allowedEnumerations = {
	priority: ["p1", "p2", "p3", "p4", "p5"],
	status: [
		"new",
		"closed",
		"contacted",
		"negotiating",
		"registered",
		"backfill",
		"prospect/marketing",
		"customer/no marketing",
	],
};

export function validateEnumerations(contact: any): any {
	for (const [field, allowedValues] of Object.entries(allowedEnumerations)) {
		const val = contact[field];
		if (!val) {
			continue;
		}

		if (allowedValues.includes(val)) {
			continue;
		}

		console.warn(
			`sanitizeContact: skipping invalid "${field}" value: "${val}". Allowed: ${allowedValues.join(
				", ",
			)}`,
		);
		delete contact[field];
	}

	return contact;
}
