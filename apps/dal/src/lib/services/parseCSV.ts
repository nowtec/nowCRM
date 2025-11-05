import Papa from "papaparse";

interface ParseCSVOptions {
	mapping: Record<string, string>;
	requiredColumns: string[];
	selectedColumns: string[];
	extraColumns: string[];
	subscribeAll: boolean;
	deduplicateByRequired: boolean;
}

export const parseCSV = (
	csvString: string,
	options: ParseCSVOptions,
): Promise<Record<string, any>[]> => {
	const {
		mapping,
		requiredColumns,
		selectedColumns,
		extraColumns,
		subscribeAll,
		deduplicateByRequired,
	} = options;

	return new Promise((resolve, reject) => {
		const result = Papa.parse(csvString, {
			header: true,
			skipEmptyLines: true,
		});

		if (result.errors.length > 0) {
			console.error("CSV Parse Errors:", result.errors);
			return reject(result.errors);
		}

		const rawData = result.data as Record<string, string>[];

		console.log(`Parsed ${rawData.length} rows from CSV`);

		const parsed = rawData
			.map((row) => {
				const mappedRow: Record<string, string> = {};
				const extra: Record<string, string> = {};

				for (const [csvHeader, value] of Object.entries(row)) {
					if (mapping[csvHeader]) {
						mappedRow[mapping[csvHeader]] = value;
					} else if (extraColumns.includes(csvHeader)) {
						extra[`_extra${csvHeader}`] = value;
					}
				}

				const hasRequired = requiredColumns.some((field) => {
					const val = mappedRow[field];
					return val !== undefined && val.trim() !== "";
				});
				if (!hasRequired) {
					console.log("Row skipped - missing required fields");
					return null;
				}

				const finalRow: Record<string, any> = {};

				for (const csvHeader of selectedColumns) {
					const field = mapping[csvHeader];
					if (field && mappedRow[field] !== undefined) {
						finalRow[field] = mappedRow[field];
					}
				}

				if (Object.keys(extra).length > 0) {
					finalRow.extra = extra;
				}
				finalRow.subscribeAll = subscribeAll;

				return finalRow;
			})
			.filter(Boolean) as Record<string, any>[];

		if (deduplicateByRequired && requiredColumns.length > 0) {
			let deduped = parsed;
			for (const col of requiredColumns) {
				const seen = new Set<string>();
				const withValue: Record<string, any>[] = [];
				const withoutValue: Record<string, any>[] = [];

				for (const row of deduped) {
					const val = (row[col] || "").trim().toLowerCase();
					if (val) {
						if (!seen.has(val)) {
							seen.add(val);
							withValue.push(row);
						}
					} else {
						withoutValue.push(row);
					}
				}

				deduped = [...withValue, ...withoutValue];
			}
			resolve(deduped);
			return;
		}

		resolve(parsed);
	});
};
