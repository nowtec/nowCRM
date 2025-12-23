"use client";
import type { BaseServiceName } from "@nowcrm/services";
import { debounce } from "lodash";
import { useEffect, useState } from "react";
import { Checkbox } from "../ui/checkbox";
import { AutoComplete, type Option } from "./auto-complete";
import { findData } from "./find-data";

type AsyncSelectProps = {
	serviceName: BaseServiceName;
	presetOption?: Option;
	defaultOption?: Option;
	fetchFilters?: Object;
	onValueChange: (option: Option) => void;
	disabled?: boolean;
	useFormClear: boolean;
	formValue?: any;
	pageSize?: number;
	dropdownClassName?: string;
	filterKey?: string | string[];
	label: string;
	debounceDelay?: number; // Optional prop to customize debounce delay
	labelBuilder?: (item: any) => string;
	showDefaultCheckbox?: boolean;
	extraOptions?: Record<string, any>;
	deduplicateByLabel?: boolean;
	extractAdditionalFields?: string[];
};

export const AsyncSelect = ({
	serviceName,
	onValueChange,
	presetOption,
	fetchFilters,
	filterKey,
	pageSize = 20,
	dropdownClassName,
	defaultOption,
	label,
	debounceDelay = 300, // Default debounce delay set to 300ms
	labelBuilder,
	showDefaultCheckbox = false, //  Default false
	extraOptions,
	deduplicateByLabel,
	extractAdditionalFields,
}: AsyncSelectProps) => {
	const [options, setOptions] = useState<Option[]>([]);
	const [selectedOption, setSelectedOption] = useState<Option | undefined>(
		() => defaultOption ?? presetOption,
	);
	const [isLoading, setIsLoading] = useState(false);
	const [useDefaultValue, setUseDefaultValue] = useState<boolean>(false);

	const [, setTotal] = useState(0);
	const [search, setSearch] = useState("");

	const handleInputChange = (input: string) => {
		if (useDefaultValue) return;
		setSearch(input);
	};
	const handleValueChange = (value: Option) => {
		if (useDefaultValue) return;
		onValueChange(value);
		setSelectedOption(value);
	};

	const handleUseDefaultChange = (checked: boolean) => {
		setUseDefaultValue(checked);
		if (checked && defaultOption) {
			setSelectedOption(defaultOption);
			onValueChange(defaultOption);
		}
	};

	useEffect(() => {
		const handler = debounce(
			async (currentPage: number, currentSearch: string, append?: boolean) => {
				setIsLoading(true);
				const keys = Array.isArray(filterKey)
					? filterKey
					: [filterKey || "name"];
				const words = currentSearch.trim().split(/\s+/);

				const searchFilters = words.length
					? {
							$and: words.map((word) => ({
								$or: keys.map((key) => ({
									[key]: { $containsi: word },
								})),
							})),
						}
					: {};

				const filters = fetchFilters
					? { $and: [searchFilters, fetchFilters] }
					: searchFilters;

				try {
					const response = await findData(serviceName, {
						filters: filters as any,
						pagination: {
							page: currentPage,
							pageSize,
						},
						...(extraOptions ?? {}),
					});
					const newOptions = response
						.data!.map((item: any) => {
							const label = labelBuilder
								? labelBuilder(item)
								: (item?.[keys[0]] as string);

							const value = item.documentId;

							const additional_data =
							extractAdditionalFields?.reduce<Record<string, any>>((acc, field) => {
								if (item?.[field] !== undefined) {
									acc[field] = item[field];
								}
								return acc;
							}, {}) ?? undefined;
						return label && value != null
							? {
									label,
									value,
									...(additional_data && Object.keys(additional_data).length > 0
										? { additional_data }
										: {}),
								}
							: null;

						})
						.filter((opt: any): opt is Option => !!opt);

					setOptions((prev) => {
						const combined = append ? [...prev, ...newOptions] : newOptions;

						const seen = new Set();

						return combined.filter((opt: any) => {
							const key = deduplicateByLabel ? opt.label : opt.value;
							if (seen.has(key)) return false;
							seen.add(key);
							return true;
						});
					});

					setTotal(response.meta?.pagination.total as number);
				} catch (error) {
					console.error("Error fetching options:", error);
				} finally {
					setIsLoading(false);
				}
			},
			debounceDelay,
		);

		handler(1, search);
		return () => handler.cancel();
	}, [
		search,
		fetchFilters,
		serviceName,
		filterKey,
		labelBuilder,
		pageSize,
		debounceDelay,
	]);

	// TODO: add scroll listener for loading more options
	// Handle loading more options
	// const handleLoadMore = () => {
	// 	if (options.length < total && !isLoading) {
	// 		// fetchOptions(page + 1, search, true);
	// 	}
	// };
	return (
		<div>
			<AutoComplete
				options={options}
				value={selectedOption}
				onValueChange={handleValueChange}
				onInputChange={handleInputChange}
				emptyMessage="No results."
				dropdownClassName={dropdownClassName}
				placeholder={`Search ${label.toLowerCase()}...`}
				isLoading={isLoading}
				isClearEnabled={!useDefaultValue}
				disabled={useDefaultValue}
			/>

			{showDefaultCheckbox && (
				<div
					style={{
						marginTop: 8,
						display: "flex",
						alignItems: "center",
						gap: 8,
					}}
				>
					<Checkbox
						checked={useDefaultValue}
						onCheckedChange={handleUseDefaultChange}
					/>
					<span className="text-sm leading-tight">
						Use default value{" "}
						{defaultOption?.label && `( ${defaultOption.label} )`}
					</span>
				</div>
			)}
		</div>
	);
};
