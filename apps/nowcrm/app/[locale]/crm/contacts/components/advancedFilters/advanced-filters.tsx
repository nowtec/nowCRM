"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Filter, Plus } from "lucide-react";
import type { Session } from "next-auth";
import * as React from "react";
import { forwardRef } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { FilterDialogFooter } from "@/components/dataTable/advancedFilters/filter-dialog-footer";
import FilterGroupComponent from "@/components/dataTable/advancedFilters/filter-group";
import { SearchHistoryPanel } from "@/components/dataTable/advancedFilters/search-history-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { transformFilters } from "@/lib/actions/filters/filters-search";
import { createSearch } from "@/lib/actions/search_history/create-search";
import {
	clearFiltersFromStorage,
	loadFiltersFromStorage,
	saveFiltersToStorage,
} from "@/lib/filters/filter-storage";
import { FIELD_TYPES, FILTER_CATEGORIES, RELATION_META } from "./filter-types";

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

interface AdvancedFiltersProps {
	session?: Session | null;
	onSubmitComplete?: (filters: any, search?: string) => void;
	onSearchChange?: (search: string, filters?: any) => void;
	showTrigger?: boolean;
	mode?: "search" | "mass-action";
	onClose?: (val: boolean) => void;
	isLoading?: boolean;
	entityType?: "contacts" | "organizations";
	currentSearch?: string;
	inline?: boolean;
}

const AdvancedFilters = forwardRef<
	{ openDrawer: () => void },
	AdvancedFiltersProps
>(function AdvancedFilters(
	{
		session,
		onSubmitComplete,
		onSearchChange,
		showTrigger = true,
		mode = "search",
		onClose,
		isLoading = false,
		entityType = "contacts",
		currentSearch,
		inline,
	},
	ref,
) {
	const [open, setOpenState] = React.useState(false);
	const [isSubmitting, setIsSubmitting] = React.useState(false);
	const [isResetting, setIsResetting] = React.useState(false);

	const form = useForm<FilterValues>({
		resolver: zodResolver(FilterSchema),
		defaultValues: {
			groups: [{ id: "group-1", logic: "AND", filters: {} }],
			groupLogic: "AND",
		},
	});

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
			(document.activeElement as HTMLElement)?.blur?.();
			setOpenState(true);
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
		(
			groupIndex: number,
			updates: Partial<{
				id: string;
				logic: string;
				filters?: Record<string, any>;
			}>,
		) => {
			const currentGroup = form.getValues(`groups.${groupIndex}`);
			// Properly merge filters if they exist in updates
			const mergedGroup: FilterGroup = {
				...currentGroup,
				...updates,
				logic: (updates.logic === "AND" || updates.logic === "OR"
					? updates.logic
					: currentGroup.logic) as "AND" | "OR",
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

	const watchedGroups = form.watch("groups");

	const [activeFiltersCount, setActiveFiltersCount] = React.useState(0);

	// Calculate active filters count whenever groups change
	React.useEffect(() => {
		const count = calculateActiveFilters();
		setActiveFiltersCount(count);
	}, [watchedGroups, calculateActiveFilters]);

	// Load filters from localStorage on mount
	React.useEffect(() => {
		const saved = loadFiltersFromStorage<FilterValues>(entityType, session);
		if (!saved) {
			setActiveFiltersCount(0);
			return;
		}
		// Basic shape guard
		if (saved && Array.isArray(saved.groups) && saved.groupLogic) {
			// Use queueMicrotask to ensure form state is properly updated
			queueMicrotask(() => {
				form.reset(saved);
				replace(saved.groups);
				// Calculate active filters count after loading from localStorage
				setTimeout(() => {
					setActiveFiltersCount(calculateActiveFilters());
				}, 50);
			});
		} else {
			setActiveFiltersCount(0);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [session, replace]);

	// Reload filters from localStorage when dialog opens (only for search mode)
	React.useEffect(() => {
		if (open && mode === "search") {
			const saved = loadFiltersFromStorage<FilterValues>(entityType, session);
			if (saved && Array.isArray(saved.groups) && saved.groupLogic) {
				// Use queueMicrotask to ensure form state is properly updated
				queueMicrotask(() => {
					form.reset(saved);
					replace(saved.groups);
					// Update count after form is reset
					setTimeout(() => {
						setActiveFiltersCount(calculateActiveFilters());
					}, 50);
				});
			} else {
				setActiveFiltersCount(calculateActiveFilters());
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open, session, replace, mode]);

	async function onSubmit(vals: FilterValues) {
		setIsSubmitting(true);
		try {
			// Transform to Strapi filters
			const strapiFilters = transformFilters(vals);

			if (mode === "mass-action") {
				// For mass actions, don't save to localStorage and just pass filters to parent
				if (onSubmitComplete) {
					onSubmitComplete(strapiFilters);
				}
				// Don't close dialog automatically in mass-action mode
			} else {
				// Save to localStorage (user-specific) - save the UI form values
				saveFiltersToStorage(entityType, vals, session);

				// Auto-save to search history (without name - unnamed search)
				if (session && entityType) {
					try {
						const filtersPayload = JSON.stringify({
							ui: vals,
							strapiFilters: strapiFilters,
						});
						const queryPayload = JSON.stringify(currentSearch || "");

						await createSearch(
							"", // Empty name for auto-saved searches
							entityType,
							filtersPayload,
							queryPayload,
						);
					} catch (error) {
						// Silently fail - search history save is not critical
						console.error("Failed to auto-save search history:", error);
					}
				}

				// Update active filters count immediately
				const count = calculateActiveFilters();
				setActiveFiltersCount(count);

				// Notify parent component
				if (onSubmitComplete) {
					onSubmitComplete(strapiFilters, currentSearch);
				}

				setOpenState(false);
			}
		} catch (e) {
			console.error("Error while applying filters", e);
		} finally {
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

			if (mode === "mass-action") {
				// For mass actions, don't save to localStorage
				setActiveFiltersCount(0);
				// Inform parent that filters cleared - pass empty object
				if (onSubmitComplete) {
					onSubmitComplete({}, currentSearch);
				}
			} else {
				clearFiltersFromStorage(entityType, session);
				setActiveFiltersCount(0);
				// Inform parent that filters cleared - pass empty object
				if (onSubmitComplete) {
					onSubmitComplete({}, currentSearch);
				}
				setOpenState(false);
			}
		} catch (e) {
			console.error("Error while resetting filters", e);
		} finally {
			setIsResetting(false);
		}
	}

	function renderContent() {
		const content = (
			<div className="flex h-full flex-col p-0">
				<DialogHeader className="px-6 pt-6 pb-4">
					<DialogTitle>Advanced Filters</DialogTitle>
					<DialogDescription>
						Apply advanced filters to refine your search
					</DialogDescription>
				</DialogHeader>

				<div className="flex flex-1 overflow-hidden">
					{/* Search History Sidebar */}
					{(mode === "search" || inline) && entityType && (
						<div className="w-80 shrink-0">
							<SearchHistoryPanel
								entityType={entityType}
								onLoadFilters={(filterValues) => {
									// Load the saved filter values into the form
									if (
										filterValues &&
										Array.isArray(filterValues.groups) &&
										filterValues.groupLogic
									) {
										// Save to localStorage first so filters persist
										saveFiltersToStorage(entityType, filterValues, session);
										// Reset form with loaded values
										form.reset(filterValues);
										replace(filterValues.groups);
										// Update active filters count
										setTimeout(() => {
											setActiveFiltersCount(calculateActiveFilters());
										}, 50);
									}
								}}
								onApplySearch={(filters, search) => {
									// When applying a saved search, update search term first if provided
									// This updates the state
									if (search !== undefined && onSearchChange) {
										onSearchChange(search, filters);
									}
									// Then apply filters to parent - pass search along so fetchData can use it
									// This triggers the fetch with both filters and search
									if (onSubmitComplete) {
										onSubmitComplete(filters, search);
									}
									// Keep dialog open so user can see the loaded filters
								}}
							/>
						</div>
					)}

					{/* Filters Content */}
					<div className="flex-1 overflow-y-auto px-6 pb-6">
						<Form {...form}>
							<form
								onSubmit={form.handleSubmit(onSubmit)}
								className="space-y-4"
							>
								{/* Group Logic Selector */}
								{groups.length > 1 && (
									<div className="flex items-center gap-2 rounded-lg border p-3">
										<span className="font-medium text-sm">
											Combine groups with:
										</span>
										<Select
											value={groupLogic}
											onValueChange={(value: "AND" | "OR") =>
												form.setValue("groupLogic", value)
											}
										>
											<SelectTrigger className="h-8 w-24">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="AND">AND</SelectItem>
												<SelectItem value="OR">OR</SelectItem>
											</SelectContent>
										</Select>
									</div>
								)}

								{/* Filter Groups */}
								<div className="space-y-1">
									{groups.map((group, index) => (
										<div
											key={typeof group.key === "string" ? group.key : group.id}
											className="relative"
										>
											<FilterGroupComponent
												form={form}
												groupIndex={index}
												control={form.control}
												onUpdateGroup={(updates) =>
													handleUpdateGroup(index, updates)
												}
												onRemoveGroup={() => handleRemoveGroup(index)}
												config={{
													FIELD_TYPES,
													FILTER_CATEGORIES,
													RELATION_META,
												}}
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

								{/* Add Group Button */}
								<Button
									type="button"
									variant="outline"
									onClick={handleAddGroup}
									className="w-full border-dashed"
								>
									<Plus className="mr-2 h-4 w-4" />
									Add Filter Group
								</Button>
							</form>
						</Form>
					</div>
				</div>

				{/* Footer Actions */}
				<FilterDialogFooter
					onCancel={() => {
						if (mode === "mass-action" && onClose) {
							onClose(false);
						} else {
							setOpenState(false);
						}
					}}
					onReset={handleReset}
					onApply={form.handleSubmit(onSubmit)}
					isSubmitting={isSubmitting}
					isResetting={isResetting}
				/>
			</div>
		);

		if (inline) {
			return <div className="h-auto rounded-lg border p-0">{content}</div>;
		}

		return (
			<Dialog
				open={open}
				onOpenChange={setOpenState}
				modal={mode !== "mass-action"}
			>
				<DialogContent className="flex h-[95vh] min-w-[95vw] flex-col p-0">
					{content}
				</DialogContent>
			</Dialog>
		);
	}

	return (
		<div className="ml-1">
			{!inline && showTrigger && (
				<Button
					variant="outline"
					size="sm"
					onClick={() => setOpenState(true)}
					className="h-10"
				>
					<Filter className="mr-2 h-4 w-4" />
					<span className="hidden md:inline">Advanced Filters</span>
					{activeFiltersCount > 0 && (
						<Badge variant="secondary" className="ml-2">
							{activeFiltersCount}
						</Badge>
					)}
				</Button>
			)}

			{renderContent()}
		</div>
	);
});

export default AdvancedFilters;
