import { saveAs } from "file-saver";
import Papa from "papaparse";

export function downloadCsv(data: any[], filename: string) {
	if (!data || data.length === 0) {
		console.warn("No data to export");
		return;
	}

	// Papa derives the columns from the first row alone, so a row carrying a
	// field the first one lacks would lose it. Rejected import rows are exactly
	// that shape - each has only the columns its CSV line filled in.
	const columns = Array.from(
		new Set(data.flatMap((row) => Object.keys(row ?? {}))),
	);

	const csv = Papa.unparse(data, { columns });
	const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
	saveAs(blob, filename);
}
