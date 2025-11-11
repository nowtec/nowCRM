"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
	Edit3,
	Filter,
	Loader2,
	Plus,
	Save,
	Star,
	StarOff,
	Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { forwardRef } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
// Import types and utilities from the base component
import { transformFilters } from "@/lib/actions/filters/filters-search";
import { createSearch } from "@/lib/actions/search_history/create-search";
import { deleteSearch } from "@/lib/actions/search_history/delete-search";
import { getSearchHistory } from "@/lib/actions/search_history/get-search-history";
import { makeFavorite } from "@/lib/actions/search_history/make-favorite-search";
import FilterGroupComponent from "./FilterGroupComponents";
import { SaveDialog } from "./SaveSearchDialog";
import { SearchHistoryType, SearchHistoryTemplate, DocumentId } from "@nowcrm/services";
import { updateSearchHistoryTemplate } from "@/lib/actions/search_history/update-search-history-template";

// Enhanced filter schema with grouping and logic
const filterGroupSchema = z.object({
	id: z.string(),
	logic: z.enum(["AND", "OR"]).default("AND"),
	filters: z.record(z.any()).optional(), // Individual filters within this group
});

const FilterSchema = z.object({
	groups: z.array(filterGroupSchema),
	groupLogic: z.enum(["AND", "OR"]).default("AND"), // Logic between groups
});

export type FilterValues = z.infer<typeof FilterSchema>;
export type FilterGroup = z.infer<typeof filterGroupSchema>;

const AdvancedFilters = forwardRef(function AdvancedFilters(
	{
		showTrigger = true,
		mode = "search",
		onSubmitComplete,
		onClose,
		currentSearchTerm,
		historyType = "contacts",
		isLoading = false,
	}: {
		showTrigger?: boolean;
		mode?: "search" | "mass-action";
		onSubmitComplete?: (payload: {
			uiFilters: FilterValues;
			strapiFilters: any;
			query?: string;
		}) => void;
		onClose?: (val: boolean) => void;
		currentSearchTerm?: string;
		historyType?: SearchHistoryType;
		isLoading?: boolean;
	},
	ref: React.Ref<{ openDrawer: () => void }>,
) {
	const t = useTranslations();
	const [open, setOpenState] = React.useState(false);
	const [pendingClose, setPendingClose] = React.useState(false);
	const [isSubmitting, setIsSubmitting] = React.useState(false);
	const [isResetting, setIsResetting] = React.useState(false);
	const LS_KEY = "contacts.filters.v2";
	const LS_SELECTED_KEY = "contacts.filters.selectedSearch";
	const [saved, setSaved] = React.useState<SearchHistoryTemplate[]>([]);
	const [loadingSaved, setLoadingSaved] = React.useState(false);
	const [faVersion, setFaVersion] = React.useState(0);
	const [selectedSavedId, setSelectedSavedId] = React.useState<
		DocumentId | undefined
	>();
	const [isUpdating, setIsUpdating] = React.useState(false);
	const [saveDialogOpen, setSaveDialogOpen] = React.useState(false);
	const [newSearchName, setNewSearchName] = React.useState("");
	const [searchQuery, _setSearchQuery] = React.useState("");
	const [favoriteLoading, setFavoriteLoading] = React.useState<Set<string>>(
		new Set(),
	);
	const [editingSearchId, setEditingSearchId] = React.useState<string | null>(
		null,
	);
	const [editingName, setEditingName] = React.useState("");
	const [renameLoading, setRenameLoading] = React.useState<Set<string>>(
		new Set(),
	);
	const [shouldCloseAfterLoad, setShouldCloseAfterLoad] = React.useState(false);

	// Track if we're explicitly allowing close (from user actions like Apply/Reset/ESC)
	const allowCloseRef = React.useRef(false);

	const setOpen = React.useCallback(
		(value: boolean | ((prev: boolean) => boolean)) => {
			const newValue = typeof value === "function" ? value(open) : value;

			// If trying to close, only allow if we explicitly set the flag OR if it's from shouldCloseAfterLoad
			if (!newValue && !allowCloseRef.current && !shouldCloseAfterLoad) {
				return;
			}

			// If trying to close while loading, save it for later
			if (!newValue && isLoading && shouldCloseAfterLoad) {
				setPendingClose(true);
				return;
			}

			setOpenState(newValue);

			if (newValue) {
				// Clear the close flag when manually opening the dialog
				setShouldCloseAfterLoad(false);
				setIsSubmitting(false);
				setIsResetting(false);
				setPendingClose(false);
				allowCloseRef.current = false;
			} else {
				// Reset the allow flag after closing
				allowCloseRef.current = false;
			}
		},
		[open, isLoading, shouldCloseAfterLoad],
	);

	const filteredSaved = React.useMemo(() => {
		if (!searchQuery.trim()) return saved;
		const query = searchQuery.toLowerCase();
		return saved.filter(
			(search) =>
				search.name.toLowerCase().includes(query) ||
				search.type.toLowerCase().includes(query),
		);
	}, [saved, searchQuery]);

	const favoriteSaved = React.useMemo(
		() => filteredSaved.filter((search) => search.favorite === true),
		[filteredSaved],
	);
	// load saved searches once
	React.useEffect(() => {
		let mounted = true;
		(async () => {
			setLoadingSaved(true);
			const res = await getSearchHistory(historyType);
			if (mounted && res?.success && Array.isArray(res.data)) {
				setSaved(res.data);
			}
			setLoadingSaved(false);
		})();
		return () => {
			mounted = false;
		};
	}, [historyType]);

	React.useEffect(() => {
		try {
			const persistedSelectedId = localStorage.getItem(LS_SELECTED_KEY);
			if (persistedSelectedId) {
				setSelectedSavedId(persistedSelectedId);
			}
		} catch {
			// Ignore localStorage errors
		}
	}, []);

	React.useEffect(() => {
		try {
			if (selectedSavedId) {
				localStorage.setItem(LS_SELECTED_KEY, selectedSavedId);
			} else {
				localStorage.removeItem(LS_SELECTED_KEY);
			}
		} catch {
			// Ignore localStorage errors
		}
	}, [selectedSavedId]);

	// Close dialog when loading completes after a filter submission
	React.useEffect(() => {
		if (shouldCloseAfterLoad && !isLoading && open) {
			allowCloseRef.current = true;
			setOpenState(false);
			setShouldCloseAfterLoad(false);
			setIsSubmitting(false);
			setIsResetting(false);
			setPendingClose(false);
		}
	}, [isLoading, shouldCloseAfterLoad, open, pendingClose]);

	const form = useForm<FilterValues>({
		resolver: zodResolver(FilterSchema),
		defaultValues: {
			groups: [{ id: "group-1", logic: "AND", filters: {} }],
			groupLogic: "AND",
		},
	});

	React.useEffect(() => {
		try {
			const raw = localStorage.getItem(LS_KEY);
			if (!raw) return;
			const saved = JSON.parse(raw) as FilterValues;
			// basic shape guard
			if (saved && Array.isArray(saved.groups) && saved.groupLogic) {
				form.reset(saved);
				replace(saved.groups);
			}
		} catch {}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const {
		fields: groups,
		append: addGroup,
		remove: removeGroup,
		replace,
	} = useFieldArray({
		control: form.control,
		name: "groups",
		keyName: "key",
	});

	const groupLogic = form.watch("groupLogic");

	React.useImperativeHandle(ref, () => ({
		openDrawer: () => {
			(document.activeElement as HTMLElement)?.blur?.(); // ✅
			setOpen(true);
		},
	}));

	const handleAddGroup = () => {
		addGroup({
			id: `group-${Date.now()}`,
			logic: "AND",
			filters: {},
		});
	};

	const handleUpdateGroup = React.useCallback(
		(groupIndex: number, updates: Partial<FilterGroup>) => {
			const currentGroup = form.getValues(`groups.${groupIndex}`);
			// Properly merge filters if they exist in updates
			const mergedGroup = {
				...currentGroup,
				...updates,
				...(updates.filters
					? { filters: { ...currentGroup.filters, ...updates.filters } }
					: {}),
			};
			form.setValue(`groups.${groupIndex}`, mergedGroup, {
				shouldDirty: true,
				shouldValidate: false, // Disable validation during typing
			});
		},
		[form],
	);

	const handleRemoveGroup = (groupIndex: number) => {
		if (groups.length > 1) {
			removeGroup(groupIndex);
		}
	};

	const calculateActiveFilters = React.useCallback(() => {
		const currentValues = form.getValues();
		return currentValues.groups.reduce((total, group) => {
			const keys = Object.keys(group.filters || {}).filter(
				(k) => !k.endsWith("_operator"),
			);
			const count = keys.filter((k) => {
				const val = group.filters?.[k];
				const op = group.filters?.[`${k}_operator`];
				const isNullOp = op === "$null" || op === "$notNull";
				return isNullOp || (val !== "" && val != null);
			}).length;
			return total + count;
		}, 0);
	}, [form]);

	const [activeFiltersCount, setActiveFiltersCount] = React.useState(0);

	React.useEffect(() => {
		if (open) {
			setActiveFiltersCount(calculateActiveFilters());
		}
	}, [open, calculateActiveFilters]);

	async function onSubmit(vals: FilterValues) {
		setIsSubmitting(true);
		try {
			// Persist UI filters for future sessions
			localStorage.setItem(LS_KEY, JSON.stringify(vals));
			// Build the Strapi-ready filters object respecting groups and groupLogic
			const strapiFilters = transformFilters(vals);
			if (mode === "mass-action") {
				// parent wants only the strapi query
				onSubmitComplete?.(strapiFilters);
				setOpen(false);
			} else {
				onSubmitComplete?.({
					uiFilters: vals,
					strapiFilters,
					query: currentSearchTerm,
				});
				// Set flag to close dialog after loading completes
				setShouldCloseAfterLoad(true);
			}
		} catch (e) {
			console.error("Error while applying filters", e);
			setIsSubmitting(false);
		}
	}

	async function handleReset() {
		setIsResetting(true);
		try {
			const blank = {
				groups: [{ id: "group-1", logic: "AND", filters: {} }],
				groupLogic: "AND",
			} as FilterValues;
			form.reset(blank);
			replace(blank.groups);
			localStorage.removeItem(LS_KEY);
			setSelectedSavedId(undefined);
			setActiveFiltersCount(0);
			// inform parent that filters cleared
			onSubmitComplete?.({ uiFilters: blank, strapiFilters: {} });
			// Set flag to close dialog after loading completes
			setShouldCloseAfterLoad(true);
		} catch (e) {
			console.error("Error while resetting filters", e);
			setIsResetting(false);
		}
	}

	const TriggerButton = (
		<Button variant="outline" size="sm">
			<Filter className="mr-2 h-4 w-4" />
			{t("AdvancedFilters.title")}
			{activeFiltersCount > 0 && (
				<Badge variant="secondary" className="ml-2">
					{activeFiltersCount}
				</Badge>
			)}
		</Button>
	);

	async function handleSaveCurrent() {
		if (!newSearchName.trim()) return;

		const ui = form.getValues();
		const strapiFilters = transformFilters(ui);
		const filtersPayload = JSON.stringify({ ui, strapiFilters });

		const res = await createSearch(
			newSearchName.trim(),
			historyType,
			filtersPayload,
			currentSearchTerm || "",
		);

		if (res?.success) {
			const listed = await getSearchHistory(historyType);
			if (listed?.success && Array.isArray(listed.data)) {
				setSaved(listed.data);
			}
			setNewSearchName("");
			setSaveDialogOpen(false);
		} else {
			console.error("Failed to save search:", res?.errorMessage);
		}
	}

	async function toggleFavorite(searchId: DocumentId) {
		const searchIdNum = (searchId);
		const currentSearch = saved.find((s) => s.documentId === searchIdNum);
		if (!currentSearch) return;

		setFavoriteLoading((prev) => new Set(prev).add(searchId));

		try {
			const newFavoriteStatus = !currentSearch.favorite;
			const res = await makeFavorite(searchIdNum, newFavoriteStatus);

			if (res?.success) {
				// Update local state immediately for better UX
				setSaved((prevSaved) =>
					prevSaved.map((search) =>
						search.documentId === searchIdNum
							? { ...search, favorite: newFavoriteStatus }
							: search,
					),
				);

				const refreshed = await getSearchHistory(historyType);
				if (refreshed?.success && Array.isArray(refreshed.data)) {
					setSaved(refreshed.data);
				}
			} else {
				console.error("Failed to update favorite status:", res?.errorMessage);
				// You could add a toast notification here
			}
		} catch (error) {
			console.error("Error toggling favorite:", error);
		} finally {
			setFavoriteLoading((prev) => {
				const newSet = new Set(prev);
				newSet.delete(searchId);
				return newSet;
			});
		}
	}

	// apply a saved search to the table
	function applySavedById(idStr: string) {
		const item = saved.find((s) => (s.documentId) === idStr);
		if (!item) return;

		let stored: any = {};
		try {
			stored = JSON.parse(item.filters as string || "{}");
		} catch {}

		const ui: FilterValues = stored.ui ?? {
			groups: [{ id: "group-1", logic: "AND", filters: {} }],
			groupLogic: "AND",
		};

		// hydrate RHF
		form.reset(ui, { keepDirtyValues: false, keepDefaultValues: false });

		// sync field-array rows, then force remount
		queueMicrotask(() => {
			replace(ui.groups ?? [{ id: "group-1", logic: "AND", filters: {} }]);
			setFaVersion((v) => v + 1);
			setActiveFiltersCount(calculateActiveFilters());
		});

		setSelectedSavedId(idStr);
	}

	async function handleUpdateSelected() {
		if (!selectedSavedId) return;
		setIsUpdating(true);
		try {
			const ui = form.getValues();
			const strapiFilters = transformFilters(ui);
			const payload = JSON.stringify({ ui, strapiFilters });

			const res = await updateSearchHistoryTemplate((selectedSavedId), {
				filters: payload,
				query: currentSearchTerm || "",
			});

			if (res?.success) {
				const listed = await getSearchHistory(historyType);
				if (listed?.success && Array.isArray(listed.data))
					setSaved(listed.data);
				form.reset(ui, { keepDirtyValues: false, keepDefaultValues: false });
				queueMicrotask(() => replace(ui.groups));
			} else {
				console.error("Failed to update search");
			}
		} finally {
			setIsUpdating(false);
		}
	}

	async function handleRename(searchId: string, newName: string) {
		if (
			!newName.trim() ||
			newName === saved.find((s) => (s.documentId) === searchId)?.name
		) {
			setEditingSearchId(null);
			setEditingName("");
			return;
		}

		setRenameLoading((prev) => new Set(prev).add(searchId));

		try {
			const res = await updateSearchHistoryTemplate((searchId), {
				name: newName.trim(),
			});

			if (res?.success) {
				// Update local state immediately for better UX
				setSaved((prevSaved) =>
					prevSaved.map((search) =>
						search.documentId === (searchId)
							? { ...search, name: newName.trim() }
							: search,
					),
				);

				// Refresh from server to ensure consistency
				const refreshed = await getSearchHistory(historyType);
				if (refreshed?.success && Array.isArray(refreshed.data)) {
					setSaved(refreshed.data);
				}
			} else {
				console.error("Failed to rename search:", res?.errorMessage);
			}
		} catch (error) {
			console.error("Error renaming search:", error);
		} finally {
			setRenameLoading((prev) => {
				const newSet = new Set(prev);
				newSet.delete(searchId);
				return newSet;
			});
			setEditingSearchId(null);
			setEditingName("");
		}
	}

	const SavedSearchesPanel = () => (
		<div className="flex w-80 flex-col border-r bg-muted/30">
			<div className="border-b p-4">
				<div className="mb-4 flex items-center justify-between">
					<Label className="font-medium text-sm">Saved Searches</Label>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => setSaveDialogOpen(true)}
					>
						<Save className="mr-2 h-4 w-4" />
						Save
					</Button>
				</div>
			</div>

			<div className="flex-1 p-4">
				{loadingSaved ? (
					<div className="flex items-center justify-center py-8">
						<Loader2 className="h-6 w-6 animate-spin" />
						<span className="ml-2 text-muted-foreground text-sm">
							Loading...
						</span>
					</div>
				) : (
					<Tabs defaultValue="all" className="w-full">
						<TabsList className="grid w-full grid-cols-2">
							<TabsTrigger value="all">
								All ({filteredSaved.length})
							</TabsTrigger>
							<TabsTrigger value="favorites">
								<Star className="mr-1 h-3 w-3" />
								Favorites ({favoriteSaved.length})
							</TabsTrigger>
						</TabsList>

						<TabsContent value="all" className="mt-4">
							<ScrollArea className="h-[calc(100vh-400px)]">
								<div className="space-y-2">
									{filteredSaved.length === 0 ? (
										<p className="py-4 text-center text-muted-foreground text-sm">
											{searchQuery
												? "No searches match your query"
												: "No saved searches yet"}
										</p>
									) : (
										filteredSaved.map((search) => (
											<SavedSearchItem key={search.documentId} search={search} />
										))
									)}
								</div>
							</ScrollArea>
						</TabsContent>

						<TabsContent value="favorites" className="mt-4">
							<ScrollArea className="h-[calc(100vh-400px)]">
								<div className="space-y-2">
									{favoriteSaved.length === 0 ? (
										<p className="py-4 text-center text-muted-foreground text-sm">
											No favorite searches yet
										</p>
									) : (
										favoriteSaved.map((search) => (
											<SavedSearchItem key={search.documentId} search={search} />
										))
									)}
								</div>
							</ScrollArea>
						</TabsContent>
					</Tabs>
				)}
			</div>

			{selectedSavedId && (
				<div className="border-t bg-background">
					<div className="flex items-center gap-2 rounded-md bg-muted/50 p-3">
						<div className="flex-1">
							<p className="font-medium text-sm">
								{saved.find((s) => (s.documentId) === selectedSavedId)?.name}
							</p>
							<p className="text-muted-foreground text-xs">Currently loaded</p>
						</div>
						<div className="flex gap-1">
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={handleUpdateSelected}
								disabled={isUpdating || !form.formState.isDirty}
							>
								{isUpdating ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Updating...
									</>
								) : (
									"Update"
								)}
							</Button>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => {
									setSelectedSavedId(undefined);
									const blank = {
										groups: [{ id: "group-1", logic: "AND", filters: {} }],
										groupLogic: "AND",
									} as FilterValues;
									form.reset(blank);
									queueMicrotask(() => replace(blank.groups));
								}}
							>
								Clear
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	);

	const SavedSearchItem = ({ search }: { search: SearchHistoryTemplate }) => {
		const isFavorite = search.favorite === true;
		const isSelected = selectedSavedId === (search.documentId);
		const isEditing = editingSearchId === (search.documentId);
		const isFavoriteLoading = favoriteLoading.has((search.documentId));
		const isRenameLoading = renameLoading.has((search.documentId));

		return (
			<div
				className={`flex items-center gap-2 rounded-md border p-2 transition-colors ${
					isSelected ? "border-primary bg-primary/10" : "hover:bg-muted/50"
				}`}
			>
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="sm"
								className="h-6 w-6 p-0"
								onClick={() => toggleFavorite((search.documentId))}
								disabled={isFavoriteLoading}
							>
								{isFavoriteLoading ? (
									<Loader2 className="h-3 w-3 animate-spin" />
								) : isFavorite ? (
									<Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
								) : (
									<StarOff className="h-3 w-3" />
								)}
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							{isFavoriteLoading
								? "Updating..."
								: isFavorite
									? "Remove from favorites"
									: "Add to favorites"}
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>

				<div className="min-w-0 flex-1">
					{isEditing ? (
						<Input
							value={editingName}
							onChange={(e) => setEditingName(e.target.value)}
							onBlur={() => {
								handleRename((search.documentId), editingName);
							}}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									handleRename((search.documentId), editingName);
								}
								if (e.key === "Escape") {
									setEditingSearchId(null);
									setEditingName("");
								}
							}}
							className="h-6 text-sm"
							disabled={isRenameLoading}
							autoFocus
						/>
					) : (
						<button
							type="button"
							onClick={() => applySavedById((search.documentId))}
							className="w-full text-left"
						>
							<div className="flex items-center gap-2">
								{isRenameLoading && (
									<Loader2 className="h-3 w-3 animate-spin" />
								)}
								<p className="truncate font-medium text-sm">{search.name}</p>
							</div>
							<p className="truncate text-muted-foreground text-xs">
								{search.type} •{" "}
								{new Date(search.createdAt).toLocaleDateString()}
							</p>
						</button>
					)}
				</div>

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							size="sm"
							className="h-6 w-6 p-0"
							disabled={isRenameLoading}
						>
							<Edit3 className="h-3 w-3" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem
							onClick={() => {
								setEditingSearchId((search.documentId));
								setEditingName(search.name);
							}}
							disabled={isRenameLoading}
						>
							<Edit3 className="mr-2 h-4 w-4" />
							Rename
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							className="text-destructive"
							onClick={async () => {
								if (
									confirm(
										"Are you sure you want to delete this saved search? This action cannot be undone.",
									)
								) {
									// deletion not implemented yet
									const res = await deleteSearch(search.documentId);
									if (res?.success) {
										const listed = await getSearchHistory(historyType);
										if (listed?.success && Array.isArray(listed.data)) {
											setSaved(listed.data);
										}
										if (selectedSavedId === (search.documentId)) {
											setSelectedSavedId(undefined);
											const blank = {
												groups: [{ id: "group-1", logic: "AND", filters: {} }],
												groupLogic: "AND",
											} as FilterValues;
											form.reset(blank);
											queueMicrotask(() => replace(blank.groups));
										}
									} else {
										console.error("Failed to delete search:");
									}
								}
							}}
						>
							<Trash2 className="mr-2 h-4 w-4" />
							Delete
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		);
	};

	const MainFiltersContent = () => (
		<div className="flex flex-1 flex-col">
			<ScrollArea className="flex-1 px-4">
				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="space-y-6 px-2 py-4"
					>
						{/* Group logic selector */}
						{groups.length > 1 && (
							<div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
								<span className="font-medium text-sm">
									Combine groups with:
								</span>
								<Select
									value={groupLogic}
									onValueChange={(value: "AND" | "OR") =>
										form.setValue("groupLogic", value)
									}
								>
									<SelectTrigger className="w-20">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="AND">AND</SelectItem>
										<SelectItem value="OR">OR</SelectItem>
									</SelectContent>
								</Select>
								<div className="ml-2 text-muted-foreground text-xs">
									{groupLogic === "AND"
										? "All groups must match"
										: "Any group can match"}
								</div>
							</div>
						)}

						{/* Filter groups */}
						<div className="space-y-1">
							{groups.map((group, index) => (
								<div key={`${faVersion}-${group.key}`} className="relative">
									<FilterGroupComponent
										form={form}
										groupIndex={index}
										control={form.control}
										onUpdateGroup={(updates) =>
											handleUpdateGroup(index, updates)
										}
										onRemoveGroup={() => handleRemoveGroup(index)}
									/>

									{/* Logic connector between groups */}
									{index < groups.length - 1 && (
										<div className="flex justify-center p-2">
											<Badge variant="outline" className="bg-background">
												{groupLogic}
											</Badge>
										</div>
									)}
								</div>
							))}
						</div>

						{/* Add group button */}
						<div className="flex justify-center">
							<Button
								type="button"
								variant="outline"
								onClick={handleAddGroup}
								className="w-full max-w-xs bg-transparent"
							>
								<Plus className="mr-2 h-4 w-4" />
								Add Filter Group
							</Button>
						</div>
					</form>
				</Form>
			</ScrollArea>
		</div>
	);

	if (!showTrigger) {
		return (
			<div>
				{/* Row with SavedSearchesPanel + MainFiltersContent + SaveDialog */}
				<div className="flex flex-row">
					<SavedSearchesPanel />
					<div className="flex flex-1 flex-col justify-items-stretch">
						<MainFiltersContent />
						{/* Row with buttons */}
						<div className="flex items-center justify-end gap-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => {
									handleReset();
									onClose?.(false);
								}}
							>
								Cancel
							</Button>
							<Button
								type="button"
								onClick={form.handleSubmit(onSubmit)}
								disabled={isSubmitting}
							>
								{isSubmitting ? "Saving..." : "Apply filters"}
							</Button>
						</div>
					</div>
					<SaveDialog
						open={saveDialogOpen}
						onOpenChange={setSaveDialogOpen}
						newSearchName={newSearchName}
						setNewSearchName={setNewSearchName}
						calculateActiveFilters={calculateActiveFilters}
						handleSaveCurrent={handleSaveCurrent}
					/>
				</div>
			</div>
		);
	}

	return (
		<>
			<div onClick={() => setOpen(true)}>{TriggerButton}</div>
			<Dialog
				open={open}
				onOpenChange={(newOpen) => {
					// If closing via X button or ESC, allow it
					if (!newOpen) {
						allowCloseRef.current = true;
					}
					setOpen(newOpen);
				}}
				modal={mode !== "mass-action"}
			>
				<DialogContent
					className="flex h-[95vh] min-w-[95vw] flex-col"
					onPointerDownOutside={(e) => {
						e.preventDefault();
					}}
					onInteractOutside={(e) => {
						e.preventDefault();
					}}
				>
					<DialogHeader className="border-b px-4 py-3">
						<div className="flex items-center justify-between">
							<div>
								<DialogTitle>{t("AdvancedFilters.title")}</DialogTitle>
								<DialogDescription>
									{t("AdvancedFilters.description")}
								</DialogDescription>
							</div>
							<div className="flex gap-2">
								<Button
									type="button"
									onClick={form.handleSubmit(onSubmit)}
									disabled={isSubmitting}
								>
									{isSubmitting
										? t("common.status.saving")
										: t("AdvancedFilters.actions.apply")}
								</Button>
								<Button
									type="button"
									variant="outline"
									onClick={handleReset}
									disabled={isResetting}
								>
									{isResetting ? (
										<>
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											Resetting...
										</>
									) : (
										t("AdvancedFilters.actions.reset")
									)}
								</Button>
							</div>
						</div>
					</DialogHeader>
					<div className="flex flex-1 overflow-hidden">
						<SavedSearchesPanel />
						<MainFiltersContent />
					</div>
				</DialogContent>
			</Dialog>
			<SaveDialog
				open={saveDialogOpen}
				onOpenChange={setSaveDialogOpen}
				newSearchName={newSearchName}
				setNewSearchName={setNewSearchName}
				calculateActiveFilters={calculateActiveFilters}
				handleSaveCurrent={handleSaveCurrent}
			/>
		</>
	);
});

export default React.memo(AdvancedFilters);
