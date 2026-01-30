"use client";

import type { Session } from "next-auth";
import * as React from "react";
import { fetchDataForVisibleColumns } from "@/components/dataTable/actions/fetch-data-for-visible-columns";
import DataTable, {
	useUrlState,
} from "@/components/dataTable/data-table-contacts";
import { transformFilters } from "@/lib/actions/filters/filters-search";
import AdvancedFilters from "../../contacts/components/advancedFilters/advanced-filters";
import AddToListDialog from "./components/add-to-list-dialog";
import { columns } from "./components/columns/contact-columns";
import MassActionsContacts from "./components/massActions/mass-actions";

type Props = {
	initialData: any[];
	initialPagination: {
		page: number;
		pageSize: number;
		pageCount: number;
		total: number;
	};
	sortBy: string;
	sortOrder: "asc" | "desc";
	tableTitle: string;
	tableName: string;
	session?: Session;
	serverFilters?: any;
};

// Helper function to restore filters from localStorage
function getInitialFilters(serverFilters?: any) {
	// Only access localStorage on the client side
	if (typeof window === "undefined") {
		return serverFilters ?? {};
	}

	try {
		const storedFilters = localStorage.getItem("contacts.filters.v2");
		if (storedFilters) {
			const parsed = JSON.parse(storedFilters);
			const strapiFilters = transformFilters(parsed);

			if (strapiFilters && Object.keys(strapiFilters).length > 0) {
				return serverFilters && Object.keys(serverFilters).length > 0
					? { $and: [serverFilters, strapiFilters] }
					: strapiFilters;
			}
		}
	} catch (error) {
		console.error("Failed to restore filters from localStorage:", error);
	}
	return serverFilters ?? {};
}

export default function ContactsTableClient({
	initialData,
	initialPagination,
	sortBy,
	sortOrder,
	tableTitle,
	tableName,
	session,
	serverFilters,
}: Props) {
	const [data, setData] = React.useState(initialData);
	const [pagination, setPagination] = React.useState(initialPagination);
	// Ref to store latest pagination values to avoid stale closures
	const paginationRef = React.useRef(pagination);
	const [isLoading, setIsLoading] = React.useState(false);
	const [searchTerm, setSearchTerm] = React.useState("");
	const [filters, setFilters] = React.useState<any>(() =>
		getInitialFilters(serverFilters),
	);
	const { getParam, updateUrl } = useUrlState();
	const selectedTag = getParam("tag");
	const selectedCountry = getParam("country");

	const combineWithSearch = React.useCallback(
		(transformed: any, term: string) => {
			const baseOr: any[] = !term
				? []
				: [
						{ email: { $containsi: term } },
						{ phone: { $containsi: term } },
						{ first_name: { $containsi: term } },
						{ last_name: { $containsi: term } },
						{ contact_types: { name: { $containsi: term } } },
						{ subscriptions: { channel: { name: { $containsi: term } } } },
						{
							actions: {
								action_type: { name: { $containsi: term } },
							},
						},
					];
			if (!baseOr.length) return transformed || {};
			const isEmptyFilter = (obj: any) =>
				!obj || (typeof obj === "object" && Object.keys(obj).length === 0);
			if (isEmptyFilter(transformed)) return { $or: baseOr };
			return { $and: [transformed, { $or: baseOr }] };
		},
		[],
	);

	const effectiveFilters = React.useMemo(() => {
		let baseFilters = combineWithSearch(filters, searchTerm);

		if (selectedTag) {
			const tagFilter = { tags: { id: { $eq: selectedTag } } };
			baseFilters = baseFilters
				? { $and: [baseFilters, tagFilter] }
				: tagFilter;
		}

		if (selectedCountry) {
			const countryFilter = { country: { $eq: selectedCountry } };
			baseFilters = baseFilters
				? { $and: [baseFilters, countryFilter] }
				: countryFilter;
		}

		return baseFilters;
	}, [filters, searchTerm, selectedTag, selectedCountry, combineWithSearch]);

	const fetchData = React.useCallback(
		async (params: {
			page?: number;
			pageSize?: number;
			sortBy?: string;
			sortOrder?: "asc" | "desc";
			filters?: any;
		}) => {
			setIsLoading(true);

			const visibleColumns = columns
				.map((c: any) => c.id ?? c.accessorKey)
				.filter(Boolean);
			const res = await fetchDataForVisibleColumns({
				visibleIds: visibleColumns,
				page: params.page ?? paginationRef.current.page,
				pageSize: params.pageSize ?? paginationRef.current.pageSize,
				sortBy: params.sortBy ?? sortBy,
				sortOrder: params.sortOrder ?? sortOrder,
				filters: params.filters ?? effectiveFilters,
				serviceName: "contactsService",
			});
			if (res?.success) {
				setData(res.data ?? []);
				if (res.meta?.pagination) {
					const newPagination = res.meta.pagination;
					setPagination(newPagination);
					// Update ref with latest pagination
					paginationRef.current = newPagination;
				}
			}
			setIsLoading(false);
		},
		[
			// Don't include pagination.page/pageSize - we use ref to avoid stale closures
			sortBy,
			sortOrder,
			effectiveFilters,
		],
	);

	const debouncedFetch = React.useMemo(() => {
		let timeoutId: NodeJS.Timeout;
		return (params: Parameters<typeof fetchData>[0]) => {
			clearTimeout(timeoutId);
			timeoutId = setTimeout(() => fetchData(params), 300);
		};
	}, [fetchData]);

	const handleSearchChange = React.useCallback(
		(term: string) => {
			console.log("[v0] Search term changed:", term);
			setSearchTerm(term);

			updateUrl({ page: 1 }); // Reset to page 1 for search
			debouncedFetch({
				page: 1,
				filters: combineWithSearch(filters, term),
			});
		},
		[updateUrl, debouncedFetch, filters, combineWithSearch],
	);

	const handleVisibleColumnsChange = React.useCallback(
		(_ids: string[], opts?: { page: number; pageSize: number }) => {
			// Reset page if column visibility changes
			fetchData({
				page: opts?.page ?? 1,
				pageSize: opts?.pageSize ?? pagination.pageSize,
				filters: effectiveFilters,
				sortBy,
				sortOrder,
			});
		},
		[fetchData, pagination.pageSize, effectiveFilters, sortBy, sortOrder],
	);

	// Keep paginationRef in sync with pagination state
	React.useEffect(() => {
		paginationRef.current = pagination;
	}, [pagination]);

	const handlePaginationChange = React.useCallback(
		(page: number, pageSize: number) => {
			updateUrl({ page, pageSize });
			// Clear data immediately to prevent showing old page data
			setData([]);
			setIsLoading(true);
			// Update ref immediately to avoid stale closure
			paginationRef.current = { ...pagination, page, pageSize };
			// Update local state optimistically
			setPagination((prev) => ({ ...prev, page, pageSize }));
			// Fetch data with new pagination
			fetchData({ page, pageSize });
		},
		[updateUrl, fetchData, pagination],
	);

	const handleSortingChange = React.useCallback(
		(newSortBy: string, newSortOrder: "asc" | "desc") => {
			console.log("[v0] Sorting change:", newSortBy, newSortOrder);

			updateUrl({ sortBy: newSortBy, sortOrder: newSortOrder, page: 1 });
			fetchData({
				sortBy: newSortBy,
				sortOrder: newSortOrder,
				page: 1,
			});
		},
		[updateUrl, fetchData],
	);

	const handleFilterSubmit = React.useCallback(
		(strapiFilters: any, query?: string) => {
			console.log("[v0] Filters applied:", strapiFilters);

			// Merge advanced filters with serverFilters instead of replacing
			const hasAdvancedFilters =
				strapiFilters && Object.keys(strapiFilters).length > 0;
			const hasServerFilters =
				serverFilters && Object.keys(serverFilters).length > 0;

			const mergedFilters = hasServerFilters
				? hasAdvancedFilters
					? { $and: [serverFilters, strapiFilters] }
					: serverFilters
				: (strapiFilters ?? {});

			setFilters(mergedFilters);
			if (typeof query === "string") {
				setSearchTerm(query);
			}

			updateUrl({ page: 1 });
			const newFilters = combineWithSearch(mergedFilters, query || searchTerm);
			fetchData({ page: 1, filters: newFilters });
		},
		[updateUrl, fetchData, searchTerm, combineWithSearch, serverFilters],
	);

	const advancedFiltersComponent = React.useMemo(() => {
		return function ListContactsAdvancedFilters() {
			return (
				<AdvancedFilters
					session={session}
					entityType="contacts"
					currentSearch={searchTerm}
					onSubmitComplete={handleFilterSubmit}
					isLoading={isLoading}
					key="advanced-filters-singleton" // Force single instance
				/>
			);
		};
	}, [session, searchTerm, handleFilterSubmit, isLoading]);

	return (
		<DataTable
			data={data}
			columns={columns}
			table_name={tableName}
			table_title={tableTitle}
			mass_actions={(props) => (
				<MassActionsContacts
					{...props}
					refreshData={() =>
						fetchData({
							page: pagination.page,
							pageSize: pagination.pageSize,
							sortBy,
							sortOrder,
							filters: effectiveFilters,
						})
					}
				/>
			)}
			pagination={pagination}
			advancedFilters={advancedFiltersComponent}
			createDialog={AddToListDialog}
			session={session}
			showStatusModal
			sorting={{ sortBy, sortOrder }}
			onVisibleColumnsChange={handleVisibleColumnsChange}
			onSearchChange={handleSearchChange}
			onSortingChange={handleSortingChange}
			onPaginationChange={handlePaginationChange}
			isLoading={isLoading}
		/>
	);
}
