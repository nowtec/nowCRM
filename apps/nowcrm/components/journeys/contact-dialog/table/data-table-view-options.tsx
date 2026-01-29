"use client";

import type { DocumentId } from "@nowcrm/services";
import { MixerHorizontalIcon } from "@radix-ui/react-icons";
import type { Table } from "@tanstack/react-table";
import Link from "next/link";
import { useMessages } from "next-intl";
import { useState } from "react";
import { GrAddCircle } from "react-icons/gr";
import PreviousJobsModal from "@/components/dataTable/additionals_modals/previous-job-modal";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface DataTableViewOptionsProps<TData> {
	table: Table<TData>;
	table_name: string;
	step_id: DocumentId;
	showStatusModal: boolean;
	refreshData: () => void;
	createDialog?: React.ComponentType<{
		step_id: DocumentId;
		refreshData: () => void;
	}>;
	hiddenCreate?: boolean;
}

export function DataTableViewOptions<TData>({
	table,
	table_name,
	createDialog: CreateDialogComponent,
	step_id,
	refreshData,
	hiddenCreate,
	showStatusModal,
}: DataTableViewOptionsProps<TData>) {
	const t: any = useMessages();
	const [viewOpen, setViewOpen] = useState(false);
	const [statusModalOpen, setStatusModalOpen] = useState(false);

	return (
		<>
			<DropdownMenu open={viewOpen} onOpenChange={setViewOpen}>
				<DropdownMenuTrigger asChild>
					<Button
						variant="outline"
						size="sm"
						className="ml-auto flex h-8 items-center gap-1"
					>
						<MixerHorizontalIcon className="h-4 w-4" />
						<span className="hidden md:inline">
							{t.DataTable.ViewOptions.view}
						</span>
					</Button>
				</DropdownMenuTrigger>

				<DropdownMenuContent align="end" className="w-[200px]">
					<DropdownMenuLabel>
						{t.DataTable.ViewOptions.toggleColumns}
					</DropdownMenuLabel>
					<DropdownMenuSeparator />
					<ScrollArea className="h-[200px] w-full rounded-md">
						<div className="p-2">
							{table
								.getAllColumns()
								.filter(
									(column) =>
										typeof column.accessorFn !== "undefined" &&
										column.getCanHide(),
								)
								.map((column) => (
									<DropdownMenuCheckboxItem
										key={column.id}
										className="my-1 capitalize"
										checked={column.getIsVisible()}
										onCheckedChange={(value) => {
											column.toggleVisibility(!!value);
											// Prevent closing by stopping event propagation
											event?.preventDefault();
											event?.stopPropagation();
										}}
										onSelect={(event) => {
											// Prevent closing by stopping event propagation
											event.preventDefault();
										}}
									>
										{column.id}
									</DropdownMenuCheckboxItem>
								))}
						</div>
					</ScrollArea>
				</DropdownMenuContent>
			</DropdownMenu>
			<PreviousJobsModal
				isOpen={statusModalOpen}
				onOpen={(value: boolean) => setStatusModalOpen(value)}
				showStatusModal={showStatusModal}
			/>
			{CreateDialogComponent ? (
				<CreateDialogComponent step_id={step_id} refreshData={refreshData} />
			) : (
				<Button
					asChild
					size="sm"
					className={cn("ml-2 h-8", hiddenCreate && "hidden")}
				>
					<Link href={`/crm/${table_name}/create`}>
						<GrAddCircle className="mr-2 h-4 w-4" />
						{t.DataTable.ViewOptions.create}
					</Link>
				</Button>
			)}
		</>
	);
}
