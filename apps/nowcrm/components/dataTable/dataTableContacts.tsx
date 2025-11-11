"use client";

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
import { useCallback } from "react";
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
import { DataTablePagination } from "./dataTablePagination";
import { DataTableViewOptions } from "./dataTableViewOptions";
import { DocumentId } from "@nowcrm/services";

interface DataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[];
	data: TData[];
	table_name: string;
	table_title: string;
	mass_actions: React.ComponentType<{
		selectedRows: DocumentId[];
		clearFunction: () => void;
		jwt?: string;
		refreshData?: () => void;
	}>;
	hiddenCollumnIds?: string[];
	session?: Session;
	advancedFilters?: React.ComponentType<{
		onSubmitComplete?: (payload: {
			uiFilters: any;
			strapiFilters: any;
		}) => void;
	}>;
	createDialog?: React.ComponentType;
	renderSubComponent?: (props: { row: RowType<TData> }) => React.ReactNode;
	pagination: {
		page: number;
		pageSize: number;
		pageCount: number;
		total: number;
	};
	hiddenSearch?: boolean;
	hiddenExport?: boolean;
	hiddenCreate?: boolean;
	showStatusModal?: boolean;
	sorting?: { sortBy: string; sortOrder: "asc" | "desc" };
	onVisibleColumnsChange?: (
		ids: string[],
		opts?: { page: number; pageSize: number },
	) => void;
	// new: parent handles refetching when search changes
	onSearchChange?: (term: string) => void;
	// new: parent tells us if filters are active to show the dot
	filtersActive?: boolean;
	// optional: parent wants to intercept filters submission directly
	onFiltersApplied?: (payload: { uiFilters: any; strapiFilters: any }) => void;
	onSortingChange?: (sortBy: string, sortOrder: "asc" | "desc") => void;
	onPaginationChange?: (page: number, pageSize: number) => void;
	isLoading?: boolean; // Add loading prop
}

function downloadCSV(data: any[], filename: string) {
	const csvRows: string[] = [];
	const headers = Object.keys(data[0]);
	csvRows.push(headers.join(","));

	for (const row of data) {
		const values = headers.map((header) => {
			let value = `${JSON.stringify(row[header])}`;
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
	renderSubComponent,
	hiddenSearch,
	hiddenExport,
	hiddenCreate,
	showStatusModal = false,
	sorting,
	onVisibleColumnsChange,
	onSearchChange,
	filtersActive,
	onFiltersApplied,
	onSortingChange,
	onPaginationChange,
	isLoading = false, // Add loading prop with default
}: DataTableProps<TData, TValue>) {
	//TODO: remove this any and make it inherit the type of locale.json
	const t: any = useMessages();
	const { updateUrl, getParam, getNumericParam } = useUrlState();

	const urlPage = getNumericParam("page", 1);
	const urlPageSize = getNumericParam("pageSize", 10);
	const urlSortBy = getParam("sortBy");
	const urlSortOrder = getParam("sortOrder", "asc") as "asc" | "desc";

	const [uiPagination, setUiPagination] = React.useState(() => ({
		pageIndex: Math.max(0, urlPage - 1),
		pageSize: urlPageSize,
	}));

	React.useEffect(() => {
		setUiPagination({
			pageIndex: Math.max(0, urlPage - 1),
			pageSize: urlPageSize,
		});
	}, [urlPage, urlPageSize]);

	const [sortingState, setSortingState] = React.useState<SortingState>(() => {
		if (urlSortBy) {
			return [{ id: urlSortBy, desc: urlSortOrder === "desc" }];
		}
		return sorting?.sortBy
			? [{ id: sorting.sortBy, desc: sorting.sortOrder === "desc" }]
			: [];
	});

	const handleSortingChange = React.useCallback(
		(updater: any) => {
			const newSorting =
				typeof updater === "function" ? updater(sortingState) : updater;
			setSortingState(newSorting);

			const first = newSorting[0];
			if (first) {
				onSortingChange?.(first.id, first.desc ? "desc" : "asc");
			}
		},
		[sortingState, onSortingChange],
	);

	const LS_FILTERS_KEY = React.useMemo(
		() => `datatable.filters.${table_name}`,
		[table_name],
	);

	const [advancedFiltersState, setAdvancedFiltersState] = React.useState(() => {
		try {
			const stored = localStorage.getItem(LS_FILTERS_KEY);
			return stored ? JSON.parse(stored) : null;
		} catch {
			return null;
		}
	});

	const handleFiltersApplied = React.useCallback(
		(payload: { uiFilters: any; strapiFilters: any }) => {
			setAdvancedFiltersState(payload);
			try {
				localStorage.setItem(LS_FILTERS_KEY, JSON.stringify(payload));
			} catch {}
			onFiltersApplied?.(payload);
			// Reset to first page when filters change
			updateUrl({ page: 1 });
			setUiPagination((p) => ({ ...p, pageIndex: 0 }));
		},
		[onFiltersApplied, LS_FILTERS_KEY, updateUrl],
	);

	// Initialize sorting state from server props
	const LS_SEARCH_KEY = React.useMemo(
		() => `datatable.search.${table_name}`,
		[table_name],
	);
	const [searchTerm, setSearchTerm] = React.useState<string>(() => {
		try {
			return localStorage.getItem(LS_SEARCH_KEY) || "";
		} catch {
			return "";
		}
	});
	const debouncedHandleSearch = React.useMemo(
		() =>
			debounce((term: string) => {
				setSearchTerm(term);
				try {
					localStorage.setItem(LS_SEARCH_KEY, term);
				} catch {}
				onSearchChange?.(term);
			}, 300),
		[onSearchChange, LS_SEARCH_KEY],
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

	const handleDownloadCSV = () => {
		const filteredData = table
			.getFilteredRowModel()
			.rows.map((row) => row.original);
		downloadCSV(filteredData, `${table_name}.csv`);
	};

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
	}, [columns, hiddenCollumnIds]);

	const table = useReactTable({
		data,
		columns: filteredColumns,
		onPaginationChange: setUiPagination,
		onSortingChange: handleSortingChange,
		onColumnVisibilityChange: setColumnVisibility,
		onRowSelectionChange: setRowSelection,
		onExpandedChange: setExpanded,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getExpandedRowModel: getExpandedRowModel(),
		getRowId: (row) => (row as any).id,
		meta: { session: session ? session : null },
		state: {
			sorting: sortingState,
			columnVisibility,
			rowSelection,
			expanded,
			pagination: uiPagination,
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

	const handlePaginationClick = React.useCallback(
		(term: string, page?: number, pageSize?: number) => {
			console.log("[v0] Pagination click:", term, page, pageSize);
			const finalPage = page ?? urlPage;
			const finalPageSize = pageSize ?? urlPageSize;
			onPaginationChange?.(finalPage, finalPageSize);
		},
		[onPaginationChange, urlPage, urlPageSize],
	);

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
							{!!searchTerm && (
								<span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
							)}
						</Button>
					</div>

					{/* Normal input for desktop */}
					<div className={cn("ml-1 hidden md:block", hiddenSearch && "hidden")}>
						<Input
							placeholder={`Filter ${table_title}...`}
							onChange={(e) => debouncedHandleSearch(e.target.value)}
							defaultValue={searchTerm}
							className="max-w-sm"
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
							<AdvancedFiltersComponent
								onSubmitComplete={handleFiltersApplied}
							/>
							{(filtersActive || advancedFiltersState) && (
								<span className="-top-1 -right-1 absolute h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
							)}
						</div>
					)}
					<DataTableViewOptions
						table_name={table_name}
						table={table}
						onDownloadCSV={handleDownloadCSV}
						createDialog={createDialog}
						hiddenExport={hiddenExport}
						hiddenCreate={hiddenCreate}
						showStatusModal={showStatusModal}
					/>
				</div>
			</div>
			<div className="overflow-y-auto rounded-md border">
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
						{isLoading ? (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className="h-24 text-center"
								>
									<div className="flex items-center justify-center">
										<div className="h-6 w-6 animate-spin rounded-full border-primary border-b-2"></div>
										<span className="ml-2">Loading...</span>
									</div>
								</TableCell>
							</TableRow>
						) : table.getRowModel().rows?.length ? (
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
					handleSearch={handlePaginationClick}
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
							defaultValue={searchTerm}
							onBlur={() => setTimeout(() => setIsMobileSearchOpen(false), 200)}
							className="w-full border-none focus:ring-2"
						/>
						<Search
							className="h-4 w-4 text-muted-foreground"
							onClick={() => {
								const term = mobileSearchRef.current?.value ?? "";
								debouncedHandleSearch.flush?.(); // lodash debounce has flush
								setSearchTerm(term);
								try {
									localStorage.setItem(LS_SEARCH_KEY, term);
								} catch {}
								onSearchChange?.(term);
							}}
						></Search>

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

export function useUrlState() {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const updateUrl = useCallback(
		(updates: Record<string, string | number | null>) => {
			const params = new URLSearchParams(searchParams.toString());

			Object.entries(updates).forEach(([key, value]) => {
				if (value === null || value === "" || value === undefined) {
					params.delete(key);
				} else {
					params.set(key, String(value));
				}
			});

			const newUrl = `${pathname}?${params.toString()}`;
			router.replace(newUrl);
		},
		[router, pathname, searchParams],
	);

	const getParam = useCallback(
		(key: string, defaultValue?: string) => {
			return searchParams.get(key) ?? defaultValue;
		},
		[searchParams],
	);

	const getNumericParam = useCallback(
		(key: string, defaultValue: number) => {
			const value = searchParams.get(key);
			return value ? Number.parseInt(value, 10) : defaultValue;
		},
		[searchParams],
	);

	return { updateUrl, getParam, getNumericParam };
}
