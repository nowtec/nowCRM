"use client";

import type { VisibilityState } from "@tanstack/react-table";
import type { Session } from "next-auth";
import * as React from "react";
import DataTable from "@/components/dataTable/data-table-old";
import { fetchContactsForVisibleColumns } from "@/lib/actions/contacts/fetch-contacts";
import { transformFilters } from "@/lib/actions/filters/filters-search";
import {
	loadFiltersFromStorage,
	loadPaginationFromStorage,
	loadSearchFromStorage,
	savePaginationToStorage,
	saveSearchToStorage,
} from "@/lib/filters/filter-storage";
import AdvancedFilters from "./components/advancedFilters/advanced-filters";
import { getColumns } from "./components/columns/contact-columns";
import createContactDialog from "./components/create-dialog";
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
	search?: string;
};

export default function ContactsTableClient({
	initialData,
	initialPagination,
	sortBy,
	sortOrder,
	tableTitle,
	tableName,
	session,
	serverFilters,
	search = "",
}: Props) {
	// Load filters from localStorage synchronously before any state initialization
	// Only check on client side (localStorage is not available during SSR)
	const initialLocalFilters = React.useMemo(() => {
		if (typeof window === "undefined") {
			return {};
		}
		try {
			const storedFilters = loadFiltersFromStorage("contacts", session);
			if (storedFilters) {
				// Transform UI filters to Strapi filters
				return transformFilters(storedFilters);
			}
		} catch {
			// Ignore localStorage errors
		}
		return {};
	}, [session]);

	// Load pagination from localStorage
	const initialPaginationFromStorage = React.useMemo(() => {
		if (typeof window === "undefined") {
			return null;
		}
		try {
			return loadPaginationFromStorage("contacts", session);
		} catch {
			return null;
		}
	}, [session]);

	// Load search from localStorage
	const initialSearchFromStorage = React.useMemo(() => {
		if (typeof window === "undefined") {
			return null;
		}
		try {
			return loadSearchFromStorage("contacts", session);
		} catch {
			return null;
		}
	}, [session]);

	// Check if we have localFilters - if so, we should refetch immediately and not show initialData
	const hasLocalFilters = React.useMemo(() => {
		return initialLocalFilters && Object.keys(initialLocalFilters).length > 0;
	}, [initialLocalFilters]);

	// Check if we have stored pagination that differs from initial
	const hasStoredPagination = React.useMemo(() => {
		return (
			initialPaginationFromStorage &&
			(initialPaginationFromStorage.page !== initialPagination.page ||
				initialPaginationFromStorage.pageSize !== initialPagination.pageSize)
		);
	}, [initialPaginationFromStorage, initialPagination]);

	// Check if we have stored search that differs from initial
	const hasStoredSearch = React.useMemo(() => {
		return (
			initialSearchFromStorage &&
			initialSearchFromStorage !== search &&
			initialSearchFromStorage.trim() !== ""
		);
	}, [initialSearchFromStorage, search]);

	// CRITICAL: Determine if we should use initialData BEFORE state initialization
	// This must be computed synchronously, not in useMemo, to prevent React from using initialData on remount
	// NEVER use initialData if:
	// 1. We have stored pagination that differs from initial (user navigated to different page)
	// 2. We have local filters
	// 3. We have stored search
	const shouldUseInitialData = (() => {
		// If we have filters or search, never use initialData
		if (hasLocalFilters || hasStoredSearch) {
			return false;
		}
		// If we have stored pagination, only use initialData if it matches exactly
		if (hasStoredPagination && initialPaginationFromStorage) {
			return (
				initialPaginationFromStorage.page === initialPagination.page &&
				initialPaginationFromStorage.pageSize === initialPagination.pageSize
			);
		}
		// No stored pagination and no filters/search - safe to use initialData (first load)
		return true;
	})();

	const [data, setData] = React.useState(() => {
		// CRITICAL: Only use initialData if:
		// 1. No stored pagination OR stored pagination matches initial (user is on page 1)
		// 2. No filters/search applied
		// 3. This is truly the first load (no stored pagination that differs)
		// 
		// If stored pagination differs from initial, NEVER use initialData (which is always page 1)
		// This prevents showing page 1 data when user has navigated to a different page
		if (!shouldUseInitialData) {
			// We have filters, search, or different pagination - start with empty data
			return [];
		}
		
		// Safe to use initialData - this is the first load with no filters/pagination/search
		return [...initialData];
	});

	// Initialize pagination from localStorage if available, otherwise use initialPagination
	// Merge stored page/pageSize with initial pagination to preserve pageCount and total
	const [pagination, setPagination] = React.useState(() => {
		if (initialPaginationFromStorage) {
			return {
				...initialPagination,
				page: initialPaginationFromStorage.page,
				pageSize: initialPaginationFromStorage.pageSize,
			};
		}
		return initialPagination;
	});

	const [isLoading, setIsLoading] = React.useState(
		hasLocalFilters || hasStoredPagination || hasStoredSearch,
	); // Show loading if we need to refetch
	const [currentSortBy] = React.useState(sortBy);
	const [currentSortOrder] = React.useState(sortOrder);
	// Use search from localStorage if available, otherwise use prop search
	const [currentSearch, setCurrentSearch] = React.useState(
		initialSearchFromStorage || search,
	);

	// Track which fields are available in current data
	const [availableFields, setAvailableFields] = React.useState<Set<string>>(
		() => {
			if (!hasLocalFilters && initialData.length > 0) {
				return new Set(Object.keys(initialData[0]));
			}
			return new Set();
		},
	);

	// Load filters from localStorage and transform them
	const [localFilters, setLocalFilters] =
		React.useState<any>(initialLocalFilters);

	// Get tag filter key for reading from localStorage
	const tagFilterKey = React.useMemo(() => {
		const userId =
			session?.user?.strapi_id || session?.user?.email || "anonymous";
		return `filters.tag.contacts.${userId}`;
	}, [session]);

	// Helper to get selected tag from localStorage
	const getSelectedTag = React.useCallback((): string | null => {
		if (typeof window === "undefined") {
			return null;
		}
		try {
			return localStorage.getItem(tagFilterKey);
		} catch {
			return null;
		}
	}, [tagFilterKey]);

	// Ref to prevent multiple simultaneous fetch calls
	const isFetchingRef = React.useRef(false);
	// Ref to store latest pagination values to avoid stale closures
	const paginationRef = React.useRef(pagination);

	// Create user-specific localStorage key
	const LS_COLUMN_VISIBILITY_KEY = React.useMemo(() => {
		const userId =
			session?.user?.strapi_id || session?.user?.email || "anonymous";
		return `datatable.columnVisibility.contacts.${userId}`;
	}, [session?.user?.strapi_id, session?.user?.email]);

	// Default visible columns (matching default visible fields from page.tsx)
	const DEFAULT_VISIBLE_COLUMN_IDS = React.useMemo(() => {
		return ["select", "actions", "first_name", "last_name", "email", "tags"];
	}, []);

	// Ref to store refetch callback for columns (to avoid circular dependency)
	const refetchRef = React.useRef<(() => void) | null>(null);

	// Get columns with session (using ref to avoid circular dependency with fetchData)
	const columns = React.useMemo(
		() =>
			getColumns(session, () => {
				if (refetchRef.current) {
					refetchRef.current();
				}
			}),
		[session],
	);

	// Initialize default column visibility in localStorage if empty (synchronously, before DataTable reads it)
	React.useMemo(() => {
		try {
			const stored = localStorage.getItem(LS_COLUMN_VISIBILITY_KEY);
			if (!stored) {
				// Set default visibility: hide all columns except default ones
				const defaultVisibility: VisibilityState = {};
				columns.forEach((col) => {
					const colId = (col as any)?.id || (col as any)?.accessorKey;
					if (colId && !DEFAULT_VISIBLE_COLUMN_IDS.includes(colId)) {
						defaultVisibility[colId] = false;
					}
				});
				localStorage.setItem(
					LS_COLUMN_VISIBILITY_KEY,
					JSON.stringify(defaultVisibility),
				);
			}
		} catch {
			// Ignore localStorage errors
		}
		return null; // useMemo must return a value
	}, [LS_COLUMN_VISIBILITY_KEY, DEFAULT_VISIBLE_COLUMN_IDS, columns]);

	// Get visible column IDs from localStorage (for DataTable component)
	const getVisibleColumnIds = React.useCallback((): string[] => {
		try {
			const stored = localStorage.getItem(LS_COLUMN_VISIBILITY_KEY);
			if (stored) {
				const parsed = JSON.parse(stored) as VisibilityState;
				// Extract visible column IDs
				const visibleIds = columns
					.filter((col) => {
						const colId = (col as any)?.id || (col as any)?.accessorKey;
						// If column visibility is explicitly set to false, hide it
						// If not set (undefined), show it (default visible)
						return colId && parsed[colId] !== false;
					})
					.map((col) => (col as any)?.id || (col as any)?.accessorKey)
					.filter(Boolean);

				// If we have stored visibility, use it
				if (visibleIds.length > 0) {
					return visibleIds;
				}
			}
		} catch {
			// Fallback to default columns
		}
		// Return default visible columns if no localStorage or empty localStorage
		return DEFAULT_VISIBLE_COLUMN_IDS;
	}, [LS_COLUMN_VISIBILITY_KEY, DEFAULT_VISIBLE_COLUMN_IDS]);

	// Get visible field names (accessorKeys) for API calls
	const getVisibleFieldNames = React.useCallback((): string[] => {
		try {
			const stored = localStorage.getItem(LS_COLUMN_VISIBILITY_KEY);
			if (stored) {
				const parsed = JSON.parse(stored) as VisibilityState;
				// Extract visible column accessorKeys (field names)
				const visibleFields = columns
					.filter((col) => {
						const colId = (col as any)?.id || (col as any)?.accessorKey;
						// If column visibility is explicitly set to false, hide it
						// If not set (undefined), show it (default visible)
						return (
							colId && parsed[colId] !== false && (col as any)?.accessorKey
						);
					})
					.map((col) => (col as any)?.accessorKey)
					.filter(Boolean);

				// If we have stored visibility, use it
				if (visibleFields.length > 0) {
					return visibleFields;
				}
			}
		} catch {
			// Fallback to default columns
		}
		// Return default visible fields (accessorKeys) if no localStorage or empty localStorage
		return columns
			.filter((col) => {
				const colId = (col as any)?.id || (col as any)?.accessorKey;
				return (
					colId &&
					DEFAULT_VISIBLE_COLUMN_IDS.includes(colId) &&
					(col as any)?.accessorKey
				);
			})
			.map((col) => (col as any)?.accessorKey)
			.filter(Boolean);
	}, [LS_COLUMN_VISIBILITY_KEY, DEFAULT_VISIBLE_COLUMN_IDS, columns]);

	const fetchData = React.useCallback(
		async (params: {
			page?: number;
			pageSize?: number;
			sortBy?: string;
			sortOrder?: "asc" | "desc";
			filters?: any;
			search?: string;
		}) => {
			// Always allow pagination changes to go through (they should cancel previous fetches)
			// For other changes, prevent multiple simultaneous calls
			if (isFetchingRef.current && params.page === undefined && params.pageSize === undefined) {
				return;
			}
			
			isFetchingRef.current = true;
			setIsLoading(true);

			try {
				// Get visible column IDs for populate mapping (don't include in deps to avoid loops)
				const visibleIds = getVisibleColumnIds();
				// Get visible field names (accessorKeys) for fields array
				const visibleFields = getVisibleFieldNames();
				// Merge filters: params.filters takes highest precedence, then localFilters, then serverFilters
				let mergedFilters =
					params.filters !== undefined
						? params.filters // If filters are explicitly passed, use them directly
						: {
								...(serverFilters ?? {}),
								...(localFilters ?? {}),
							};

				// Add tag filter if selected (read from localStorage)
				const selectedTag = getSelectedTag();
				if (selectedTag) {
					// Tags use documentId for filtering (TagFilterHeader stores documentId)
					const tagFilter = { tags: { documentId: { $eq: selectedTag } } };
					if (Object.keys(mergedFilters).length > 0) {
						// Flatten $and structures instead of nesting
						const filterArray = mergedFilters.$and
							? mergedFilters.$and
							: [mergedFilters];
						mergedFilters = { $and: [...filterArray, tagFilter] };
					} else {
						mergedFilters = tagFilter;
					}
				}

				const pageToUse = params.page ?? paginationRef.current.page;
				const pageSizeToUse = params.pageSize ?? paginationRef.current.pageSize;

				// Normalize search: use param if provided, otherwise use currentSearch, treat empty/null as no search
				const searchToUse =
					params.search !== undefined
						? params.search?.trim() || ""
						: currentSearch?.trim() || "";
				const res = await fetchContactsForVisibleColumns({
					visibleIds, // For populate mapping
					visibleFields, // For fields array
					page: pageToUse,
					pageSize: pageSizeToUse,
					sortBy: params.sortBy ?? currentSortBy,
					sortOrder: params.sortOrder ?? currentSortOrder,
					filters: mergedFilters,
					search: searchToUse,
				});
				if (res?.success && res.data) {
					// Set the fetched data - always use data state, never initialData prop
					setData(res.data);
					if (res.meta?.pagination) {
						const newPagination = res.meta.pagination;
						// Verify the response matches what we requested (for pagination changes)
						// If we explicitly requested a page, use that; otherwise use server response
						const finalPagination =
							params.page !== undefined || params.pageSize !== undefined
								? {
										...newPagination,
										page: params.page ?? newPagination.page,
										pageSize: params.pageSize ?? newPagination.pageSize,
									}
								: newPagination;
						
						setPagination(finalPagination);
						// Update ref with latest pagination
						paginationRef.current = finalPagination;
						// Save pagination to localStorage
						savePaginationToStorage(
							"contacts",
							{ page: finalPagination.page, pageSize: finalPagination.pageSize },
							session,
						);
					}
					// Update available fields
					if (res.data.length > 0) {
						setAvailableFields(new Set(Object.keys(res.data[0])));
					}
				}
			} catch (error) {
				// On error, don't clear data - keep current data visible
				console.error("Failed to fetch contacts:", error);
			} finally {
				setIsLoading(false);
				isFetchingRef.current = false;
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[
			// Don't include pagination.page/pageSize - we use ref to avoid stale closures
			currentSortBy,
			currentSortOrder,
			currentSearch,
			serverFilters,
			localFilters,
			getSelectedTag,
			// Don't include getVisibleColumnIds - we call it fresh each time
		],
	);

	const handleVisibleColumnsChange = React.useRef((_ids: string[]) => {
		// Refetch data when column visibility changes
		fetchData({
			page: 1, // Reset to first page
		});
	});

	// Keep paginationRef in sync with pagination state
	React.useEffect(() => {
		paginationRef.current = pagination;
	}, [pagination]);

	// Update the ref when fetchData changes
	React.useEffect(() => {
		handleVisibleColumnsChange.current = (_ids: string[]) => {
			fetchData({
				page: 1,
			});
		};
		// Update refetchRef for columns to use
		refetchRef.current = () => fetchData({ page: 1 });
	}, [fetchData]);

	// On mount, check if we need to refetch with merged filters or different columns
	React.useEffect(() => {
		const visibleFields = getVisibleFieldNames();
		const initialFields = new Set(Object.keys(initialData[0] || {}));

		// Check if any visible field is missing from initial data
		const missingFields = visibleFields.filter(
			(field) => !initialFields.has(field as string),
		);

		// If we have localFilters OR missing fields OR tag filter OR stored pagination OR stored search, refetch with correct fields/filters/pagination/search
		// This ensures we always fetch with merged filters if localFilters or tag filter exist, or if pagination/search differs
		const hasTagFilter = getSelectedTag() !== null;
		if (
			(hasLocalFilters ||
				missingFields.length > 0 ||
				hasTagFilter ||
				hasStoredPagination ||
				hasStoredSearch) &&
			!isFetchingRef.current
		) {
			// Clear data if we need to refetch
			setData([]);
			fetchData({});
		}

		// Initialize column visibility if localStorage is empty
		try {
			const storedVisibility = localStorage.getItem(LS_COLUMN_VISIBILITY_KEY);
			if (!storedVisibility) {
				// Set default visibility: hide all columns except default ones
				const defaultVisibility: VisibilityState = {};
				columns.forEach((col) => {
					const colId = (col as any)?.id || (col as any)?.accessorKey;
					if (colId && !DEFAULT_VISIBLE_COLUMN_IDS.includes(colId)) {
						defaultVisibility[colId] = false;
					}
				});
				localStorage.setItem(
					LS_COLUMN_VISIBILITY_KEY,
					JSON.stringify(defaultVisibility),
				);
			}
		} catch {
			// Ignore localStorage errors
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []); // Only run on mount

	// Listen for tag filter changes
	React.useEffect(() => {
		const handleTagFilterChange = () => {
			// Small delay to ensure localStorage is updated
			setTimeout(() => {
				fetchData({ page: 1 });
			}, 0);
		};
		window.addEventListener("tagFilterChanged", handleTagFilterChange);
		return () => {
			window.removeEventListener("tagFilterChanged", handleTagFilterChange);
		};
	}, [fetchData]);

	return (
		<DataTable
			data={data}
			columns={columns}
			table_name={tableName}
			table_title={tableTitle}
			mass_actions={MassActionsContacts}
			pagination={pagination}
			createDialog={createContactDialog}
			createDialogProps={{
				onSuccess: () => {
					// Refetch data after creating contact
					fetchData({ page: 1 });
				},
			}}
			advancedFilters={React.useMemo(() => {
				const handleFilterSubmit = (filters: any, search?: string) => {
					// Update filters state immediately
					setLocalFilters(filters || {});
					// Update search term if provided
					if (search !== undefined) {
						const normalizedSearch = search?.trim() || "";
						saveSearchToStorage("contacts", normalizedSearch, session);
						setCurrentSearch(normalizedSearch);
					}
					// Refetch with new filters and search
					// Pass both explicitly to ensure they're used
					fetchData({ page: 1, filters: filters || {}, search: search });
				};

				return function ContactsAdvancedFilters() {
					return (
						<AdvancedFilters
							session={session}
							onSubmitComplete={handleFilterSubmit}
							onSearchChange={(search, filters) => {
								// Update search term when applying search history
								const normalizedSearch = search?.trim() || "";
								saveSearchToStorage("contacts", normalizedSearch, session);
								setCurrentSearch(normalizedSearch);
								// If filters are provided, update localFilters state
								if (filters !== undefined) {
									setLocalFilters(filters || {});
								}
								// Fetch data with new search and filters
								// Use provided filters if available, otherwise use current localFilters
								const filtersToUse =
									filters !== undefined ? filters : localFilters;
								fetchData({
									page: 1,
									search: normalizedSearch,
									filters: filtersToUse,
								});
							}}
							entityType="contacts"
							currentSearch={currentSearch}
						/>
					);
				};
			}, [session, fetchData])}
			session={session}
			showStatusModal
			sorting={{ sortBy: currentSortBy, sortOrder: currentSortOrder }}
			onVisibleColumnsChange={(ids) => handleVisibleColumnsChange.current(ids)}
			onPaginationChange={(page, pageSize) => {
				// Save pagination to localStorage immediately
				savePaginationToStorage("contacts", { page, pageSize }, session);
				// Clear data immediately - we only want to show fetched data for the new page
				// Since we never use initialData prop after mount, clearing data shows empty/loading
				setData([]);
				// Set loading state immediately to show loading skeletons
				setIsLoading(true);
				// Update local state optimistically for immediate UI feedback
				const newPagination = { ...pagination, page, pageSize };
				setPagination(newPagination);
				// Update ref immediately to avoid stale closure
				paginationRef.current = newPagination;
				// Fetch data with new pagination - use explicit params to ensure correct page
				fetchData({ page, pageSize });
			}}
			onSearchChange={(searchTerm) => {
				// Trim and normalize search term
				const normalizedSearch = searchTerm?.trim() || "";
				// Save search to localStorage immediately (empty string clears it)
				saveSearchToStorage("contacts", normalizedSearch, session);
				// Update local state
				setCurrentSearch(normalizedSearch);
				// Fetch data with new search (reset to page 1)
				// Pass empty string explicitly to clear search filters
				fetchData({ page: 1, search: normalizedSearch });
			}}
			initialSearch={currentSearch}
			isLoading={isLoading}
			availableFields={availableFields}
		/>
	);
}
