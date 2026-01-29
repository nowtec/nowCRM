"use client";

import type { DocumentId } from "@nowcrm/services";
import {
	type ColumnDef,
	type ExpandedState,
	flexRender,
	getCoreRowModel,
	getExpandedRowModel,
	getSortedRowModel,
	type Row as RowType,
	type SortingState,
	useReactTable,
	type VisibilityState,
} from "@tanstack/react-table";
import { debounce } from "lodash";
import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Session } from "next-auth";
import { useMessages } from "next-intl";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { DataTablePagination } from "./data-table-pagination";
import { DataTableViewOptions } from "./data-table-view-options";

interface DataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[];
	data: TData[];
	table_name: string;
	table_title: string;
	step_id: DocumentId;
	hiddenCollumnIds?: string[];
	session?: Session;
	mass_actions: React.ComponentType<{
		selectedRows: DocumentId[];
		clearFunction: () => void;
		jwt?: string;
		journeyStepId: DocumentId;
		dropdownModal: boolean;
		refreshData: () => void;
	}>;
	pagination: {
		page: number;
		pageSize: number;
		pageCount: number;
		total: number;
	};
	advancedFilters?: React.ComponentType<{}>;
	createDialog?: React.ComponentType<{
		step_id: DocumentId;
		refreshData: () => void;
	}>;
	renderSubComponent?: (props: { row: RowType<TData> }) => React.ReactNode;

	refreshData: () => void;
	hiddenSearch?: boolean;
	hiddenCreate?: boolean;
	showStatusModal?: boolean;
	sorting: { sortBy: string; sortOrder: "asc" | "desc" };
	setSorting: (s: { sortBy: string; sortOrder: "asc" | "desc" }) => void;
}

export default function DataTable<TData, TValue>({
	columns,
	data,
	table_name,
	table_title,
	step_id,
	mass_actions: MassActionsComponent,
	hiddenCollumnIds,
	pagination,
	session,
	advancedFilters: AdvancedFiltersComponent,
	createDialog,
	refreshData,
	renderSubComponent,
	hiddenSearch,
	hiddenCreate,
	showStatusModal = false,
	sorting,
	setSorting,
}: DataTableProps<TData, TValue>) {
	const searchParams = useSearchParams();
	const pathname = usePathname();
	const router = useRouter();

	//TODO: remove this any and make it inherit the type of locale.json
	const t: any = useMessages();

	const handleSearch = React.useCallback(
		(term: string, page?: number, pageSize?: number) => {
			const params = new URLSearchParams(searchParams as any);
			if (term) {
				params.set("search", term);
			} else {
				params.delete("search");
			}
			if (page !== undefined) {
				params.set("page", page.toString());
			}
			if (pageSize !== undefined) {
				params.set("pageSize", pageSize.toString());
			}
			router.replace(`${pathname}?${params.toString()}`, { scroll: false });
		},
		[searchParams, pathname, router],
	);

	const debouncedHandleSearch = React.useMemo(
		() => debounce(handleSearch, 300),
		[handleSearch],
	);

	// Initialize sorting state from server props
	const [sortingState, setSortingState] = React.useState<SortingState>(() => {
		return sorting?.sortBy
			? [{ id: sorting.sortBy, desc: sorting.sortOrder === "desc" }]
			: [];
	});

	const handleSortingChange = React.useCallback(
		(updater: any) => {
			const newSorting =
				typeof updater === "function" ? updater(sortingState) : updater;
			setSortingState(newSorting);

			if (newSorting.length > 0) {
				const { id, desc } = newSorting[0];
				setSorting({ sortBy: id, sortOrder: desc ? "desc" : "asc" });
			} else {
				setSorting({ sortBy: "createdAt", sortOrder: "desc" }); // default fallback
			}
		},
		[setSorting],
	);

	const initialVisibility = columns.reduce((acc, column) => {
		if (column.meta?.hidden && (column as any)?.accessorKey) {
			acc[(column as any).accessorKey as string] = false;
		}
		return acc;
	}, {} as VisibilityState);

	const [columnVisibility, setColumnVisibility] =
		React.useState<VisibilityState>(initialVisibility);
	const [rowSelection, setRowSelection] = React.useState({});

	const [expanded, setExpanded] = React.useState<ExpandedState>({});

	const filteredColumns = React.useMemo(() => {
		return columns.filter((column) => {
			if (column.id === "delete") {
				if (session && session.user.role.toLowerCase() !== "admin")
					return false;
			}
			if (column?.id && hiddenCollumnIds?.includes(column.id)) {
				return false;
			}
			return true;
		});
	}, [columns, session?.user?.role, hiddenCollumnIds]);

	const table = useReactTable({
		data,
		columns: filteredColumns,
		onSortingChange: handleSortingChange,
		onColumnVisibilityChange: setColumnVisibility,
		onRowSelectionChange: setRowSelection,
		onExpandedChange: setExpanded,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getExpandedRowModel: getExpandedRowModel(),
		getRowId: (row) => (row as any).documentId,
		meta: {
			session: session ? session : null,
			step_id: step_id,
			refreshData: refreshData,
		},
		state: {
			sorting: sortingState,
			columnVisibility,
			rowSelection,
			expanded,
			pagination: {
				pageIndex: pagination.page - 1,
				pageSize: pagination.pageSize,
			},
		},
		manualPagination: true,
		manualSorting: true,
		pageCount: pagination.pageCount,
	});

	const [isMobileSearchOpen, setIsMobileSearchOpen] = React.useState(false);
	const mobileSearchRef = React.useRef<HTMLInputElement | null>(null);

	React.useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setIsMobileSearchOpen(false);
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	return (
		<div>
			<div className="w-full overflow-x-auto">
				<div className="flex min-w-max items-center py-4">
					{/* Responsive search input */}
					<div className={cn("md:hidden", hiddenSearch && "hidden")}>
						<Button
							onClick={() => setIsMobileSearchOpen(true)}
							className="relative rounded-md border border-input bg-background p-2"
						>
							<Search className="h-5 w-5 text-muted-foreground" />
							{!!searchParams.get("search")?.trim().length && (
								<span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
							)}
						</Button>
					</div>

					{/* Normal input for desktop */}
					<div className={cn("ml-1 hidden md:block", hiddenSearch && "hidden")}>
						<Input
							placeholder={`Filter ${table_title}...`}
							onChange={(e) => debouncedHandleSearch(e.target.value)}
							defaultValue={searchParams.get("search")?.toString()}
							className="max-w-sm"
						/>
					</div>

					<MassActionsComponent
						selectedRows={Object.keys(table.getState().rowSelection).map(
							(key) => key,
						)}
						clearFunction={table.resetRowSelection}
						jwt={table.options.meta?.session?.jwt}
						journeyStepId={step_id}
						refreshData={refreshData}
						dropdownModal
					/>

					{/* Render Advanced Filters if provided */}
					{AdvancedFiltersComponent && <AdvancedFiltersComponent />}
					<DataTableViewOptions
						table_name={table_name}
						table={table}
						createDialog={createDialog}
						refreshData={refreshData}
						step_id={step_id}
						hiddenCreate={hiddenCreate}
						showStatusModal={showStatusModal}
					/>
				</div>
			</div>
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => (
									<TableHead key={header.id} className="w-[50px]">
										{header.isPlaceholder
											? null
											: flexRender(
													header.column.columnDef.header,
													header.getContext(),
												)}
									</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map((row) => (
								<React.Fragment key={row.id}>
									<TableRow data-state={row.getIsSelected() && "selected"}>
										{row.getVisibleCells().map((cell) => (
											<TableCell key={cell.id}>
												{flexRender(
													cell.column.columnDef.cell,
													cell.getContext(),
												)}
											</TableCell>
										))}
									</TableRow>
									{row.getIsExpanded() && renderSubComponent && (
										<TableRow>
											<TableCell colSpan={columns.length}>
												{renderSubComponent({
													row,
												})}
											</TableCell>
										</TableRow>
									)}
								</React.Fragment>
							))
						) : (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className="h-24 text-center"
								>
									{t.DataTable.noResults}
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
			<div className="my-4">
				<DataTablePagination
					table={table}
					handleSearch={handleSearch}
					pagination={pagination}
				/>
			</div>
			{/* Mobile pop up search input */}
			{isMobileSearchOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center px-4 backdrop-blur-sm">
					<div className="flex w-full max-w-md items-center gap-4">
						<Input
							autoFocus
							ref={mobileSearchRef}
							placeholder={`Filter ${table_title}...`}
							defaultValue={searchParams.get("search")?.toString()}
							onBlur={() => setTimeout(() => setIsMobileSearchOpen(false), 200)}
							className="w-full border-none focus:ring-2"
						/>
						<Search
							className="h-4 w-4 text-muted-foreground"
							onClick={() => handleSearch(mobileSearchRef.current?.value ?? "")}
						/>
						<Button
							onClick={() => setIsMobileSearchOpen(false)}
							className="text-muted-foreground text-sm"
						>
							✕
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
