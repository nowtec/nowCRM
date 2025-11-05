const allowedEnumerations = {
	status: ["new", "existed"],
};

export function validateEnumerations<T extends Record<string, any>>(
	entity: T,
): T {
	for (const [field, allowed] of Object.entries(allowedEnumerations)) {
		if (entity[field] != null && !allowed.includes(entity[field])) {
			throw new Error(`Invalid value for "${field}": ${entity[field]}`);
		}
	}
	return entity;
}
