export function generateFieldsFromObject(obj: Record<string, any>) {
	const fieldsList: Array<{ id: string; name: string }> = [];
	let idCounter = 1;

	for (const key in obj) {
		if (!Object.hasOwn(obj, key)) continue;
		const value = obj[key];

		// 1. Primitives & Date ➔ contact.key
		if (
			value === null ||
			value === undefined ||
			typeof value !== "object" ||
			value instanceof Date
		) {
			fieldsList.push({
				id: String(idCounter++),
				name: `contact.${key}`,
			});

			// 2. Arrays (of objects) ➔ contact.key
		} else if (Array.isArray(value)) {
			const first = value[0];

			fieldsList.push({
				id: String(idCounter++),
				name:
					first && typeof first === "object" && "name" in first
						? `contact.${key}.name`
						: `contact.${key}`,
			});

			// 3. Plain objects ➔ contact.key.name
		} else {
			fieldsList.push({
				id: String(idCounter++),
				name: `contact.${key}.name`,
			});
		}
	}

	return fieldsList;
}
