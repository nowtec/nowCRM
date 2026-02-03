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
import { Search, SearchIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Session } from "next-auth";
import { useMessages } from "next-intl";
import * as React from "react";
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
import { Button } from "../ui/button";
import { DataTablePagination } from "./data-table-pagination";
import { DataTableViewOptions } from "./data-table-view-options";

interface DataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[];
	data: TData[];
	table_name: string;
	table_title: string;
	hiddenCollumnIds?: string[];
	session?: Session;
	mass_actions: React.ComponentType<{
		selectedRows: DocumentId[];
		clearFunction: () => void;
		jwt?: string;
	}>;
	pagination: {
		page: number;
		pageSize: number;
		pageCount: number;
		total: number;
	};
	advancedFilters?: React.ComponentType<{}>;
	createDialog?: React.ComponentType;
	renderSubComponent?: (props: { row: RowType<TData> }) => React.ReactNode;

	hiddenSearch?: boolean;
	hiddenCreate?: boolean;
	showStatusModal?: boolean;
	sorting?: { sortBy: string; sortOrder: "asc" | "desc" };
	onVisibleColumnsChange?: (
		ids: string[],
		opts?: { page: number; pageSize: number },
	) => void;
}

function hasActiveFilters(params: URLSearchParams): boolean {
	return Array.from(params.keys()).some((key) => key.startsWith("filters["));
}

export default function DataTable<TData, TValue>({
	columns,
	data,
	table_name,
	table_title,
	mass_actions: MassActionsComponent,
	hiddenCollumnIds,
	pagination,
	session,
	advancedFilters: AdvancedFiltersComponent,
	createDialog,
	renderSubComponent,
	hiddenSearch,
	hiddenCreate,
	showStatusModal = false,
	sorting,
	onVisibleColumnsChange,
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
		() => debounce(handleSearch, 500),
		[handleSearch],
	);

	// Initialize sorting state from server props
	const [sortingState, setSortingState] = React.useState<SortingState>(() => {
		return sorting?.sortBy
			? [{ id: sorting.sortBy, desc: sorting.sortOrder === "desc" }]
			: [];
	});

	const updateURL = React.useCallback(
		(updates: Record<string, string | number | undefined>) => {
			const params = new URLSearchParams(searchParams.toString());

			Object.entries(updates).forEach(([key, value]) => {
				if (value === undefined || value === "") {
					params.delete(key);
				} else {
					params.set(key, String(value));
				}
			});

			router.replace(`${pathname}?${params.toString()}`, { scroll: false });
		},
		[searchParams, pathname, router],
	);

	const handleSortingChange = React.useCallback(
		(updater: any) => {
			const newSorting =
				typeof updater === "function" ? updater(sortingState) : updater;
			setSortingState(newSorting);

			if (newSorting.length > 0) {
				const { id, desc } = newSorting[0];
				updateURL({
					sortBy: id,
					sortOrder: desc ? "desc" : "asc",
					page: 1, // Reset to first page when sorting changes
				});
			} else {
				updateURL({
					sortBy: undefined,
					sortOrder: undefined,
					page: 1,
				});
			}
		},
		[sortingState, updateURL],
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
		meta: { session: session ? session : null },
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
	const pageIndex = table.getState().pagination.pageIndex;
	const pageSize = table.getState().pagination.pageSize;

	React.useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setIsMobileSearchOpen(false);
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	const filtersAreActive = React.useMemo(
		() => hasActiveFilters(searchParams),
		[searchParams],
	);

	React.useEffect(() => {
		if (!onVisibleColumnsChange) return;
		const ids = filteredColumns
			.map((c: any) => c.id ?? c.accessorKey)
			.filter(Boolean)
			.filter((id) => columnVisibility[id] !== false);

		onVisibleColumnsChange(ids as string[], { page: pageIndex + 1, pageSize });
	}, [
		columnVisibility,
		filteredColumns,
		onVisibleColumnsChange,
		pageIndex,
		pageSize,
	]);

	return (
		<div>
			<div className="w-full">
				<div className="flex h-16 min-w-max items-center">
					{/* Responsive search input */}
					<div className={cn("md:hidden", hiddenSearch && "hidden")}>
						<Button
							onClick={() => setIsMobileSearchOpen(true)}
							className="relative rounded-sm border border-input bg-card p-2"
						>
							<Search className="h-5 w-5 text-muted-foreground" />
							{!!searchParams.get("search")?.trim().length && (
								<span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
							)}
						</Button>
					</div>

					{/* Normal input for desktop */}
					<div className={cn("hidden w-58 md:block", hiddenSearch && "hidden")}>
						<div className="pointer-events-none absolute mt-3 ml-4 text-muted-foreground">
							<SearchIcon className="h-[16px] w-[16px]" />
						</div>
						<Input
							placeholder={`Search ${table_title}...`}
							onChange={(e) => debouncedHandleSearch(e.target.value)}
							defaultValue={searchParams.get("search")?.toString()}
							className="max-w-sm bg-card pl-10 hover:border-accent-foreground/20"
						/>
					</div>

					<MassActionsComponent
						selectedRows={Object.keys(table.getState().rowSelection).map(
							(key) => key as DocumentId,
						)}
						clearFunction={table.resetRowSelection}
						jwt={table.options.meta?.session?.jwt}
					/>

					{/* Render Advanced Filters if provided */}
					{AdvancedFiltersComponent && (
						<div className="relative ml-2">
							<AdvancedFiltersComponent />
							{filtersAreActive && (
								<span className="-top-1 -right-1 absolute h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
							)}
						</div>
					)}
					<DataTableViewOptions
						table_name={table_name}
						table={table}
						createDialog={createDialog}
						hiddenCreate={hiddenCreate}
						showStatusModal={showStatusModal}
					/>
				</div>
			</div>
			<div className="rounded-md border bg-card">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => (
									<TableHead
										key={header.id}
										className="h-11 w-[50px] whitespace-nowrap font-semibold"
									>
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
										{row.getVisibleCells().map((cell) => {
											const isEmailColumn =
												cell.column.id === "email" ||
												(cell.column.columnDef as any).accessorKey === "email";
											return (
												<TableCell
													key={cell.id}
													className={cn(
														"px-4 py-3",
														isEmailColumn &&
															"min-w-[200px] max-w-none whitespace-normal break-all",
													)}
												>
													{flexRender(
														cell.column.columnDef.cell,
														cell.getContext(),
													)}
												</TableCell>
											);
										})}
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
