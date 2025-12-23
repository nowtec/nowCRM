export function cleanEmptyStringsToNull(
	obj: Record<string, any>,
): Record<string, any> {
	const cleaned: Record<string, any> = {};

	for (const key in obj) {
		const value = obj[key];

		if (typeof value === "string") {
			let v: string;
			try {
				v = value.trim();
			} catch {
				continue;
			}

			if (key === "phone" || key === "mobile_phone") {
				let res = "";
				for (let i = 0; i < v.length; i++) {
					const c = v[i];
					if (c === "+" && i === 0) {
						res += c;
					} else if (c >= "0" && c <= "9") {
						res += c;
					}
				}
				v = res;
			}

			if (v === "") {
				cleaned[key] = null;
			} else {
				cleaned[key] = v;
			}
			continue;
		}

		if (Array.isArray(value)) {
			const arr = value
				.map((item) => {
					if (typeof item !== "string") return item;
					try {
						const t = item.trim();
						return t === "" ? null : t;
					} catch {
						return null;
					}
				})
				.filter((v) => v !== undefined);

			if (arr.length > 0) {
				cleaned[key] = arr;
			}
			continue;
		}

		if (value && typeof value === "object") {
			const nested = cleanEmptyStringsToNull(value);
			if (Object.keys(nested).length > 0) {
				cleaned[key] = nested;
			}
			continue;
		}

		cleaned[key] = value;
	}

	return cleaned;
}
