import {
	ChevronLeftIcon,
	ChevronRightIcon,
	DoubleArrowLeftIcon,
	DoubleArrowRightIcon,
} from "@radix-ui/react-icons";
import type { Table } from "@tanstack/react-table";
import { useSearchParams } from "next/navigation";
import { useMessages } from "next-intl";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

interface DataTablePaginationProps<TData> {
	table: Table<TData>;
	handleSearch: (term: string, page?: number, pageSize?: number) => void;
	pagination: {
		page: number;
		pageSize: number;
		pageCount: number;
		total: number;
	};
}

export function DataTablePagination<TData>({
	table,
	handleSearch,
	pagination,
}: DataTablePaginationProps<TData>) {
	const searchParams = useSearchParams();
	const pageSize = pagination.pageSize;
	const t = useMessages();
	return (
		<div className="flex items-center justify-between px-2">
			<div className="flex-1 text-muted-foreground text-sm">
				{Object.keys(table.getState().rowSelection).length}{" "}
				{t.DataTable.Pagination.of} {pagination.total}{" "}
				{t.DataTable.Pagination.rowsSelected}
			</div>
			<div className="flex items-center space-x-6 lg:space-x-8">
				<div className="flex items-center space-x-2">
					<p className="font-medium text-muted-foreground text-sm">
						{t.DataTable.Pagination.rowsPerPage}
					</p>
					<Select
						value={`${pageSize}`}
						onValueChange={(value) => {
							// Don't call table.setPageSize/setPageIndex - parent controls pagination via props
							handleSearch(
								searchParams.get("search")?.toString() || "",
								1,
								Number(value),
							);
						}}
					>
						<SelectTrigger className="h-8 w-[70px] cursor-pointer bg-card font-medium text-muted-foreground hover:border-accent-foreground/25">
							<SelectValue placeholder={pageSize} />
						</SelectTrigger>
						<SelectContent side="top">
							{[10, 20, 30, 40, 50, 100].map((pageSize) => (
								<SelectItem key={pageSize} value={`${pageSize}`}>
									{pageSize}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="flex w-[100px] items-center justify-center font-medium text-muted-foreground text-sm">
					{t.DataTable.Pagination.page} {pagination.page}{" "}
					{t.DataTable.Pagination.of} {pagination.pageCount}
				</div>
				<div className="flex items-center space-x-2">
					<Button
						type="button"
						variant="outline"
						className="hidden h-8 w-8 bg-card p-0 text-muted-foreground hover:border-accent-foreground/25 lg:flex"
						onClick={() => {
							// Don't call table.setPageIndex - parent controls pagination via props
							handleSearch(
								searchParams.get("search")?.toString() || "",
								1,
								pageSize,
							);
						}}
						disabled={pagination.page === 1 || pagination.pageCount === 0}
					>
						<span className="sr-only">{t.DataTable.Pagination.goToFirst}</span>
						<DoubleArrowLeftIcon className="h-4 w-4" />
					</Button>
					<Button
						type="button"
						variant="outline"
						className="h-8 w-8 bg-card p-0 text-muted-foreground hover:border-accent-foreground/25"
						onClick={() => {
							// Don't call table.previousPage - parent controls pagination via props
							handleSearch(
								searchParams.get("search")?.toString() || "",
								pagination.page - 1,
								pageSize,
							);
						}}
						disabled={pagination.page === 1 || pagination.pageCount === 0}
					>
						<span className="sr-only">
							{t.DataTable.Pagination.goToPrevious}
						</span>
						<ChevronLeftIcon className="h-4 w-4" />
					</Button>
					<Button
						type="button"
						variant="outline"
						className="h-8 w-8 bg-card p-0 text-muted-foreground hover:border-accent-foreground/25"
						onClick={() => {
							// Don't call table.nextPage - parent controls pagination via props
							handleSearch(
								searchParams.get("search")?.toString() || "",
								pagination.page + 1,
								pageSize,
							);
						}}
						disabled={
							pagination.page === pagination.pageCount ||
							pagination.pageCount === 0
						}
					>
						<span className="sr-only">{t.DataTable.Pagination.goToNext}</span>
						<ChevronRightIcon className="h-4 w-4" />
					</Button>
					<Button
						type="button"
						variant="outline"
						className="hidden h-8 w-8 bg-card p-0 text-muted-foreground hover:border-accent-foreground/25 lg:flex"
						onClick={() => {
							// Don't call table.setPageIndex - parent controls pagination via props
							handleSearch(
								searchParams.get("search")?.toString() || "",
								pagination.pageCount,
								pageSize,
							);
						}}
						disabled={
							pagination.page === pagination.pageCount ||
							pagination.pageCount === 0
						}
					>
						<span className="sr-only">{t.DataTable.Pagination.goToLast}</span>
						<DoubleArrowRightIcon className="h-4 w-4" />
					</Button>
				</div>
			</div>
		</div>
	);
}
