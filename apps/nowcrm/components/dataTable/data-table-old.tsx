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
import { saveAs } from "file-saver";
import { debounce } from "lodash";
import { Search } from "lucide-react";
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
import { Skeleton } from "../ui/skeleton";
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
	createDialog?: React.ComponentType<any>;
	createDialogProps?: Record<string, any>;
	renderSubComponent?: (props: { row: RowType<TData> }) => React.ReactNode;

	hiddenSearch?: boolean;
	hiddenExport?: boolean;
	hiddenCreate?: boolean;
	showStatusModal?: boolean;
	sorting?: { sortBy: string; sortOrder: "asc" | "desc" };
	onVisibleColumnsChange?: (visibleColumnIds: string[]) => void;
	onPaginationChange?: (page: number, pageSize: number) => void;
	onSearchChange?: (search: string, filters?: any) => void;
	initialSearch?: string;
	isLoading?: boolean;
	availableFields?: Set<string>;
}

function downloadCSV(data: any[], filename: string) {
	const csvRows: string[] = [];
	const headers = Object.keys(data[0]);
	csvRows.push(headers.join(","));

	for (const row of data) {
		const values = headers.map((header) => {
			let value = `${JSON.stringify(row[header])})`;
			value = value.replace(/"/g, '""');
			if (value.includes(",") || value.includes("\n")) {
				value = `"${value}"`;
			}
			return value;
		});
		csvRows.push(values.join(","));
	}

	const csvData = new Blob([csvRows.join("\n")], { type: "text/csv" });
	saveAs(csvData, filename);
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
	createDialogProps,
	renderSubComponent,
	hiddenSearch,
	hiddenExport,
	hiddenCreate,
	showStatusModal = false,
	sorting,
	onVisibleColumnsChange,
	onPaginationChange,
	onSearchChange,
	initialSearch,
	isLoading = false,
	availableFields,
}: DataTableProps<TData, TValue>) {
	const searchParams = useSearchParams();
	const pathname = usePathname();
	const router = useRouter();

	//TODO: remove this any and make it inherit the type of locale.json
	const t: any = useMessages();

	const handleSearch = React.useCallback(
		(term: string, page?: number, pageSize?: number) => {
			// Remove search and pagination from URL (both are stored in localStorage)
			const params = new URLSearchParams(searchParams as any);
			params.delete("search");
			params.delete("page");
			params.delete("pageSize");
			// Only update URL if there are other params, otherwise remove all params
			const newUrl = params.toString()
				? `${pathname}?${params.toString()}`
				: pathname;
			router.replace(newUrl, { scroll: false });

			// Determine if this is a search change or just a pagination change
			const currentSearchTerm = initialSearch || "";
			const isSearchChange = term !== currentSearchTerm;
			const isPaginationChange = page !== undefined || pageSize !== undefined;

			// CRITICAL: Only call ONE callback to avoid duplicate fetches
			// If it's a pagination change (with or without search), use onPaginationChange
			// If it's ONLY a search change (no pagination params), use onSearchChange
			if (isPaginationChange && onPaginationChange) {
				// Pagination change - let parent handle the fetch with correct page
				const finalPage = page ?? 1;
				const finalPageSize = pageSize ?? pagination.pageSize;
				onPaginationChange(finalPage, finalPageSize);
			} else if (isSearchChange && onSearchChange) {
				// Pure search change (no pagination params) - notify parent
				onSearchChange(term || "");
			}
		},
		[
			searchParams,
			pathname,
			router,
			onPaginationChange,
			onSearchChange,
			initialSearch,
			pagination.pageSize,
		],
	);

	const debouncedHandleSearch = React.useMemo(
		() => debounce(handleSearch, 300),
		[handleSearch],
	);

	// Clean up pagination and search from URL on mount (both are stored in localStorage)
	React.useEffect(() => {
		const params = new URLSearchParams(searchParams.toString());
		if (params.has("page") || params.has("pageSize") || params.has("search")) {
			params.delete("page");
			params.delete("pageSize");
			params.delete("search");
			// Only update URL if there are other params, otherwise remove all params
			const newUrl = params.toString()
				? `${pathname}?${params.toString()}`
				: pathname;
			router.replace(newUrl, { scroll: false });
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []); // Only run on mount

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
					// Don't set page in URL - pagination is in localStorage
				});
				// Reset pagination to page 1 via callback (pagination is in localStorage)
				if (onPaginationChange) {
					onPaginationChange(1, pagination.pageSize);
				}
			} else {
				updateURL({
					sortBy: undefined,
					sortOrder: undefined,
					// Don't set page in URL - pagination is in localStorage
				});
				// Reset pagination to page 1 via callback (pagination is in localStorage)
				if (onPaginationChange) {
					onPaginationChange(1, pagination.pageSize);
				}
			}
		},
		[sortingState, updateURL, onPaginationChange, pagination.pageSize],
	);

	// Handle pagination changes from TanStack Table - route to parent callback
	const handlePaginationChange = React.useCallback(
		(updater: any) => {
			// Prevent TanStack Table from updating its own state
			// Instead, call parent's onPaginationChange callback
			if (onPaginationChange) {
				const newPagination =
					typeof updater === "function"
						? updater({
								pageIndex: pagination.page - 1,
								pageSize: pagination.pageSize,
							})
						: updater;
				// Convert pageIndex (0-based) to page (1-based)
				const newPage = (newPagination.pageIndex ?? pagination.page - 1) + 1;
				const newPageSize = newPagination.pageSize ?? pagination.pageSize;
				onPaginationChange(newPage, newPageSize);
			}
		},
		[onPaginationChange, pagination],
	);

	// Initialize visibility from localStorage or default from column meta
	// Get user ID from session for user-specific storage
	const userId = React.useMemo(() => {
		return session?.user?.strapi_id || session?.user?.email || "anonymous";
	}, [session?.user?.strapi_id, session?.user?.email]);

	const LS_COLUMN_VISIBILITY_KEY = React.useMemo(
		() => `datatable.columnVisibility.${table_name}.${userId}`,
		[table_name, userId],
	);

	const getInitialVisibility = React.useCallback(() => {
		try {
			const stored = localStorage.getItem(LS_COLUMN_VISIBILITY_KEY);
			if (stored) {
				const parsed = JSON.parse(stored);
				return parsed as VisibilityState;
			}
		} catch {
			// Fallback to empty object if parsing fails
		}
		// Return empty object - all columns visible by default (no hidden columns)
		// Individual entities can override this behavior if needed
		return {} as VisibilityState;
	}, [LS_COLUMN_VISIBILITY_KEY]);

	const [columnVisibility, setColumnVisibility] =
		React.useState<VisibilityState>(getInitialVisibility);
	const [rowSelection, setRowSelection] = React.useState({});

	const [expanded, setExpanded] = React.useState<ExpandedState>({});

	const handleDownloadCSV = () => {
		const filteredData = table
			.getFilteredRowModel()
			.rows.map((row) => row.original);
		downloadCSV(filteredData, `${table_name}.csv`);
	};

	const filteredColumns = React.useMemo(() => {
		return columns
			.filter((column) => {
				if (column.id === "delete") {
					if (session && session.user.role.toLowerCase() !== "admin")
						return false;
				}
				if (column?.id && hiddenCollumnIds?.includes(column.id)) {
					return false;
				}
				return true;
			})
			.map((column) => {
				// Wrap cell renderer to show skeleton if field is not available
				if (availableFields && (column as any)?.accessorKey) {
					const accessorKey = (column as any).accessorKey;
					const originalCell = column.cell;

					// Skip wrapping if it's a special column (select, actions, etc.)
					if (
						!accessorKey ||
						column.id === "select" ||
						column.id === "actions"
					) {
						return column;
					}

					return {
						...column,
						cell: (props: any) => {
							// Check if field exists in available fields
							const fieldAvailable = availableFields.has(accessorKey);

							if (!fieldAvailable) {
								// Show skeleton when field is not available (column was just made visible)
								return <Skeleton className="h-4 w-20" />;
							}

							// Use original cell renderer or default
							if (originalCell && typeof originalCell === "function") {
								return originalCell(props);
							}

							// Default render
							const value = props.row.original[accessorKey];
							return <div>{value}</div>;
						},
					};
				}
				return column;
			});
	}, [
		columns,
		session?.user?.role,
		hiddenCollumnIds,
		availableFields,
		isLoading,
	]);

	// Sync column visibility changes to localStorage
	const handleColumnVisibilityChange = React.useCallback(
		(updater: any) => {
			const newVisibility =
				typeof updater === "function" ? updater(columnVisibility) : updater;
			setColumnVisibility(newVisibility);

			try {
				localStorage.setItem(
					LS_COLUMN_VISIBILITY_KEY,
					JSON.stringify(newVisibility),
				);
			} catch {
				// Ignore localStorage errors
			}

			// Notify parent of visible column IDs (use setTimeout to avoid calling during render)
			if (onVisibleColumnsChange) {
				const visibleIds = columns
					.filter((col) => {
						const colId = (col as any)?.id || (col as any)?.accessorKey;
						// Skip columns that are filtered out or don't have accessorKey
						if (!colId || !(col as any)?.accessorKey) return false;
						if (
							col.id === "delete" &&
							session &&
							session.user.role.toLowerCase() !== "admin"
						)
							return false;
						if (col?.id && hiddenCollumnIds?.includes(col.id)) return false;
						// Check visibility
						return newVisibility[colId] !== false;
					})
					.map((col) => (col as any)?.id || (col as any)?.accessorKey)
					.filter(Boolean);
				// Use setTimeout to avoid calling during state update
				setTimeout(() => {
					onVisibleColumnsChange(visibleIds);
				}, 0);
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[
			columnVisibility,
			LS_COLUMN_VISIBILITY_KEY,
			columns,
			hiddenCollumnIds,
			session,
		],
		// Don't include onVisibleColumnsChange in deps to avoid infinite loops
	);

	const table = useReactTable({
		data,
		columns: filteredColumns,
		onSortingChange: handleSortingChange,
		onColumnVisibilityChange: handleColumnVisibilityChange,
		onRowSelectionChange: setRowSelection,
		onExpandedChange: setExpanded,
		onPaginationChange: handlePaginationChange,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getExpandedRowModel: getExpandedRowModel(),
		getRowId: (row) => (row as any).documentId,
		meta: {
			session: session ? session : null,
		} as any,
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
							defaultValue={
								initialSearch || searchParams.get("search")?.toString() || ""
							}
							className="max-w-sm"
						/>
					</div>

					<MassActionsComponent
						selectedRows={Object.keys(table.getState().rowSelection).map(
							(key) => key,
						)}
						clearFunction={table.resetRowSelection}
						jwt={table.options.meta?.session?.jwt}
					/>

					{/* Render Advanced Filters if provided */}
					{AdvancedFiltersComponent && <AdvancedFiltersComponent />}
					<DataTableViewOptions
						table_name={table_name}
						table={table}
						onDownloadCSV={handleDownloadCSV}
						createDialog={createDialog}
						createDialogProps={createDialogProps}
						hiddenExport={hiddenExport}
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
						) : isLoading ? (
							// Show loading skeletons when loading
							Array.from({ length: pagination.pageSize }).map((_, index) => (
								<TableRow key={`loading-${index}`}>
									{filteredColumns.map((_column, colIndex) => (
										<TableCell key={colIndex}>
											<Skeleton className="h-4 w-full" />
										</TableCell>
									))}
								</TableRow>
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
							defaultValue={
								initialSearch || searchParams.get("search")?.toString() || ""
							}
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
