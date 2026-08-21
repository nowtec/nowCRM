"use client";

import type { ImportRecord } from "@nowcrm/services";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ReusableTable } from "@/components/dataTable/table-reusable";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { downloadCsv } from "@/lib/actions/import/download-csv";
import { getPreviousImports } from "@/lib/actions/import/fetch-import";
import { ImportStatusBadge } from "../../import-status-badge";

interface PreviousImportsModalProps {
	isOpen: boolean;
	onClose: () => void;
}

export default function PreviousImportsModal({
	isOpen,
	onClose,
}: PreviousImportsModalProps) {
	const [previousImports, setPreviousImports] = useState<ImportRecord[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [apiPage, setApiPage] = useState(1);
	const apiPageSize = 10;
	const [localPage, setLocalPage] = useState(1);
	const localPageSize = 5;

	const load = async (page: number) => {
		setIsLoading(true);

		try {
			const [importsRes] = await Promise.all([
				getPreviousImports(page, apiPageSize, "contacts"),
			]);

			if (!importsRes.success) {
				toast.error("Failed to load imports. Please try again later.");
				return;
			}

			const imports = importsRes.data || [];
			if (imports.length === 0) {
				toast("No imports yet – try uploading your first file", {
					icon: "⚠️",
				});
				setPreviousImports([]);
				return;
			}
			const enriched = imports.map((imp) => ({
				...imp,
			}));

			setPreviousImports(enriched);
			setApiPage(page);
			setLocalPage(1);
		} catch {
			toast.error("Failed to load data. Please check your connection.");
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		if (isOpen) {
			load(apiPage);
		}
	}, [isOpen]);

	useEffect(() => {
		if (!isOpen) return;

		const fetchProgress = async () => {
			try {
				setPreviousImports((prev) =>
					prev.map((imp) => ({
						...imp,
					})),
				);
			} catch (_error) {
				console.error("Failed to fetch live progress");
			}
		};

		fetchProgress();
	}, [isOpen]);

	const columns = [
		{
			key: "id",
			header: "ID",
		},
		{
			key: "filename",
			header: "Filename",
			render: (item: ImportRecord) => (
				<Tooltip>
					<TooltipTrigger asChild>
						<div className="max-w-[200px] cursor-pointer truncate">
							{item.filename}
						</div>
					</TooltipTrigger>
					<TooltipContent side="top">
						<p className="whitespace-normal">{item.filename}</p>
					</TooltipContent>
				</Tooltip>
			),
		},
		{
			key: "createdAt",
			header: "Date",
			render: (item: ImportRecord) => new Date(item.createdAt).toLocaleString(),
		},
		{
			key: "status",
			header: "Status",
			render: (item: ImportRecord) => <ImportStatusBadge item={item} />,
		},
		{
			key: "failedContacts",
			header: "Failed Contacts",
			render: (item: ImportRecord) => {
				const count = item.failedContacts?.length ?? 0;
				return count > 0 ? (
					<span className="font-medium text-red-700 dark:text-red-200">
						{count}
					</span>
				) : (
					<span className="text-muted-foreground">0</span>
				);
			},
		},
		{
			key: "download",
			header: "Download Failed",
			render: (item: ImportRecord) => {
				const failedContacts = item.failedContacts;
				if (failedContacts && failedContacts.length > 0) {
					return (
						<button
							type="button"
							onClick={() =>
								downloadCsv(
									failedContacts,
									`${item.filename.replace(/\s/g, "_")}_failed_contacts.csv`,
								)
							}
							className="text-blue-600 hover:underline"
						>
							Download CSV
						</button>
					);
				} else {
					return <span className="text-muted-foreground">—</span>;
				}
			},
		},
	];

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="min-w-[70vw]">
				<DialogHeader>
					<DialogTitle>Previous Imports</DialogTitle>
				</DialogHeader>

				{isLoading ? (
					<div className="flex justify-center py-6">
						<Loader2 className="h-8 w-8 animate-spin text-primary" />
					</div>
				) : previousImports.length > 0 ? (
					<ReusableTable
						data={previousImports}
						columns={columns}
						searchKey="*"
						// searchPlaceholder="Search..."
						itemsPerPage={localPageSize}
						currentPage={localPage}
						onPageChange={(page) => {
							if (page > 4) {
								load(apiPage + 1);
							} else if (page < 1 && apiPage > 1) {
								load(apiPage - 1);
								setLocalPage(4);
							} else {
								setLocalPage(page);
							}
						}}
						totalItems={previousImports.length}
					/>
				) : (
					<p className="text-center text-gray-500" />
				)}
			</DialogContent>
		</Dialog>
	);
}
