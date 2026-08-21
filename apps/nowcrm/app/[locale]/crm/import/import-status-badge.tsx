"use client";

import type { ImportRecord } from "@nowcrm/services";
import { cn } from "@/lib/utils";

const STATUS_TONES: Record<string, string> = {
	completed:
		"bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-950 dark:text-green-200",
	processing:
		"bg-yellow-50 text-yellow-700 ring-yellow-600/20 dark:bg-yellow-950 dark:text-yellow-200",
	queued: "bg-muted/50 text-muted-foreground ring-muted-foreground/20",
	failed:
		"bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950 dark:text-red-200",
};

const FALLBACK_TONE = "bg-muted text-muted-foreground ring-muted-foreground/20";

export function ImportStatusBadge({ item }: { item: ImportRecord }) {
	const status = item.status || "unknown";

	return (
		<span
			className={cn(
				"inline-flex items-center rounded-md px-2 py-1 font-medium text-xs ring-1 ring-inset",
				STATUS_TONES[status] ?? FALLBACK_TONE,
			)}
		>
			{status === "processing" && item.progressPercent
				? `processing ${item.progressPercent}%`
				: status}
		</span>
	);
}
