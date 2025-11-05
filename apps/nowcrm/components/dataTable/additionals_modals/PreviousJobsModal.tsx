"use client";

import { DialogTrigger } from "@radix-ui/react-dialog";
import { Loader2 } from "lucide-react";
import { useMessages } from "next-intl";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ReusableTable } from "@/components/dataTable/tableReusable";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { getCompositionJobs } from "@/lib/actions/composer/get-composition-jobs";
import {
	getImportProgressMap,
	getPreviousImports,
} from "@/lib/actions/import/fetchImports";
import type { JobCompositionRecord } from "@/lib/types/new_type/composition";
import type { ImportRecord } from "@/lib/types/new_type/import";

interface PreviousJobsModalProps {
	isOpen: boolean;
	onOpen: (value: boolean) => void;
	showStatusModal: boolean;
	mode?: string;
}

type PreviousItem =
	| (ImportRecord & { progressPercent?: number })
	| JobCompositionRecord;

export default function PreviousJobsModal({
	isOpen,
	onOpen,
	showStatusModal,
	mode = "contacts",
}: PreviousJobsModalProps) {
	const [previousImports, setPreviousImports] = useState<PreviousItem[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [apiPage, setApiPage] = useState(1);
	const apiPageSize = 10;
	const [localPage, setLocalPage] = useState(1);
	const localPageSize = 5;

	const t: any = useMessages();

	//  composer ---
	const composerColumns = [
		{ key: "composition_id", header: "Composition ID" },
		{
			key: "name",
			header: "Composition name",
			render: (item: any) => (
				<Tooltip>
					<TooltipTrigger asChild>
						<div className="max-w-[250px] cursor-pointer truncate text-sm">
							{item.name}
						</div>
					</TooltipTrigger>
					<TooltipContent side="top" align="start">
						<p className="max-w-xs whitespace-normal">{item.name}</p>
					</TooltipContent>
				</Tooltip>
			),
		},
		{
			key: "channels",
			header: "Сhannel",
			render: (item: any) =>
				Array.isArray(item.channels) ? item.channels.join(", ") : "—",
		},
		{
			key: "createdAt",
			header: "Created at",
			render: (item: any) => new Date(item.createdAt).toLocaleString(),
		},
		{
			key: "from",
			header: "Identity",
			render: (item: any) => {
				const [name, email] = item.from.split("<");
				return (
					<div className="max-w-[300px] whitespace-normal break-words text-sm leading-[1.2]">
						<strong>{name.trim()}</strong>
						<br />
						<span className="text-muted-foreground">&lt;{email}</span>
					</div>
				);
			},
		},

		{
			key: "to",
			header: "Recipients",
			render: (item: any) => (
				<div className="max-h-24 w-full overflow-y-auto text-sm leading-tight">
					<div>
						<strong>Type:</strong> {item.type ?? "—"}
					</div>
					<div>
						<strong>ID:</strong> {item.to ?? "—"}
					</div>
					<div>
						<strong>Name:</strong> {item.title ?? "—"}
					</div>
				</div>
			),
		},
		{
			key: "logs",
			header: "Failures",
			render: (item: any) => (
				<div className="max-h-16 w-full overflow-y-auto whitespace-pre-wrap break-words bg-transparent text-sm">
					{item.logs}
				</div>
			),
		},
	];

	// contacts ---
	const contactsColumns = [
		{ key: "id", header: "ID" },
		{
			key: "parsedSearchMask",
			header: "Filters",
			render: (item: any) => (
				<span className="text-muted-foreground">
					{item.parsedSearchMask || "—"}
				</span>
			),
		},
		{
			key: "createdAt",
			header: "Date",
			render: (item: any) => new Date(item.createdAt).toLocaleString(),
		},
		{
			key: "massAction",
			header: "Mass Action",
			render: (item: any) => <span>{item.massAction || "—"}</span>,
		},
		{
			key: "failedContacts",
			header: "Failed Contacts",
			render: (item: any) => {
				const failedContacts = item.failedContacts;
				if (failedContacts && failedContacts.length > 0) {
					return (
						<div className="max-h-16 max-w-[250px] space-y-1 overflow-y-auto break-words text-sm">
							{failedContacts.map((fc: any, index: number) => (
								<div key={index}>
									<strong>{fc.email}</strong>: {fc.reason}
								</div>
							))}
						</div>
					);
				}
				return (
					<span className="text-muted-foreground">No failed contacts</span>
				);
			},
		},
	];

	const columns = mode === "composer" ? composerColumns : contactsColumns;

	const load = async (page: number) => {
		setIsLoading(true);

		try {
			if (mode === "contacts") {
				const [importsRes, progressRes] = await Promise.all([
					getPreviousImports(page, apiPageSize, "mass-actions"),
					getImportProgressMap(),
				]);
				if (!importsRes.success || !progressRes.success) {
					toast.error("Failed to load data. Please try again later.");
					return;
				}
				const imports = importsRes.data || [];
				if (imports.length === 0) {
					toast("No data yet – try uploading your first file", { icon: "⚠️" });
					setPreviousImports([]);
					return;
				}
				const enriched = imports.map((imp) => ({
					...imp,
				}));
				setPreviousImports(enriched);
			} else {
				const compRes = await getCompositionJobs(page, apiPageSize);
				if (!compRes.success) {
					toast.error(
						"Failed to load composition data. Please try again later.",
					);
					return;
				}
				const comps = compRes.data || [];
				setPreviousImports(comps);
			}

			setApiPage(page);
			setLocalPage(1);
		} catch {
			toast.error("Failed to load data. Please check your connection.");
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		if (isOpen) load(apiPage);
	}, [isOpen, mode]);

	useEffect(() => {
		if (!isOpen || mode !== "contacts") return;
		const fetchProgress = async () => {
			try {
				const progressRes = await getImportProgressMap();
				if (!progressRes.success || !progressRes.data) return;
				const progressMap = progressRes.data;
				setPreviousImports((prev) =>
					(prev as ImportRecord[]).map((imp) => ({
						...imp,
						progressPercent: progressMap.get(imp.jobId) ?? imp.progressPercent,
					})),
				);
			} catch {
				console.error("Failed to fetch live progress");
			}
		};
		fetchProgress();
	}, [isOpen, mode]);

	return (
		<Dialog open={isOpen} onOpenChange={onOpen}>
			<DialogTrigger asChild>
				<Button
					variant="outline"
					size="sm"
					className="ml-2 h-10 bg-card text-muted-foreground capitalize hover:border-accent-foreground/25"
					hidden={!showStatusModal}
				>
					{t.DataTable.ViewOptions.status ?? "status"}
				</Button>
			</DialogTrigger>
			<DialogContent className="mx-auto flex min-w-[70vw] max-w-[90vw] flex-col overflow-auto p-0">
				<DialogHeader className="p-6 pb-2">
					<DialogTitle>Previous Jobs</DialogTitle>
				</DialogHeader>
				<TooltipProvider>
					<div className="flex flex-1 flex-col overflow-hidden p-6 pt-2">
						{isLoading ? (
							<div className="flex justify-center py-6">
								<Loader2 className="h-8 w-8 animate-spin text-primary" />
							</div>
						) : previousImports.length > 0 ? (
							<div className="flex-1 overflow-auto">
								<ReusableTable
									data={previousImports}
									columns={columns}
									searchKey="*"
									itemsPerPage={localPageSize}
									currentPage={localPage}
									className="w-full table-auto"
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
							</div>
						) : (
							<p className="text-center text-gray-500">
								No previous jobs found.
							</p>
						)}
					</div>
				</TooltipProvider>
			</DialogContent>
		</Dialog>
	);
}
