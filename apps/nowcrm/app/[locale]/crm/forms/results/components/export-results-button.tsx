"use client";

import type { DocumentId } from "@nowcrm/services";
import { saveAs } from "file-saver";
import { Download } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { exportFormResults } from "@/lib/actions/forms/export-form-results";

export default function ExportResultsButton() {
	const params = useParams<{ id: DocumentId }>();
	const [isExporting, setIsExporting] = useState(false);

	if (!params?.id) return null;

	const handleExport = async () => {
		setIsExporting(true);
		try {
			const res = await exportFormResults(params.id);
			if (!res.success || !res.data) {
				toast.error(res.errorMessage || "Failed to export form results.");
				return;
			}

			const filename = `form_${params.id}_results.csv`;
			const blob = new Blob([res.data], {
				type: "text/csv;charset=utf-8;",
			});
			saveAs(blob, filename);
			toast.success("Form results exported");
		} catch {
			toast.error("Failed to export form results.");
		} finally {
			setIsExporting(false);
		}
	};

	return (
		<Button
			onClick={handleExport}
			variant="outline"
			size="sm"
			className="ml-2 h-10"
			disabled={isExporting}
		>
			<Download className="mr-2 h-4 w-4" />
			{isExporting ? "Exporting..." : "Export Results"}
		</Button>
	);
}
