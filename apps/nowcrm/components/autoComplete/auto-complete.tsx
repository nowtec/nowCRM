"use client";

import { Command as CommandPrimitive } from "cmdk";
import { Check, X } from "lucide-react";
import {
	type KeyboardEvent,
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { useElementPosition } from "@/lib/hooks/use-ui-position";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import {
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "../ui/command";
import { Skeleton } from "../ui/skeleton";

export type Option = {
	value: string;
	label: string;
	additional_data?: Record<string, any>;
};

type AutoCompleteProps = {
	options: Option[];
	emptyMessage: string;
	className?: string;
	value?: Option;
	onValueChange?: (value: Option) => void;
	onInputChange?: (input: string) => void;
	isLoading?: boolean;
	isClearEnabled?: boolean;
	disabled?: boolean;
	placeholder?: string;
	dropdownClassName?: string;
};

export const AutoComplete = ({
	options,
	placeholder,
	emptyMessage,
	className,
	dropdownClassName,
	value,
	onValueChange,
	onInputChange,
	disabled,
	isClearEnabled,
	isLoading = false,
}: AutoCompleteProps) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const dropdownRef = useRef<HTMLDivElement>(null);

	const [isOpen, setOpen] = useState(false);
	const [selected, setSelected] = useState<Option | undefined>(value);
	const [inputValue, setInputValue] = useState<string>(value?.label || "");
	const [dropdownHeight, setDropdownHeight] = useState<number>(250);

	useEffect(() => {
		setSelected(value);
		setInputValue(value?.label || "");
	}, [value]);

	// Measure the dropdown's actual height whenever it opens or its content changes.
	useLayoutEffect(() => {
		if (isOpen && dropdownRef.current) {
			const rect = dropdownRef.current.getBoundingClientRect();
			setDropdownHeight(rect.height);
		}
	}, [isOpen]);

	// Pass the measured height and current open state to the hook.
	const { shouldOpenUpward } = useElementPosition(
		containerRef as any,
		dropdownHeight,
		isOpen,
	);

	const handleKeyDown = useCallback(
		(event: KeyboardEvent<HTMLDivElement>) => {
			const input = inputRef.current;
			if (!input) return;

			if (!isOpen) {
				setOpen(true);
			}

			if (event.key === "Enter" && input.value !== "") {
				const optionToSelect = options.find(
					(option) => option.label === input.value,
				);
				if (optionToSelect) {
					setSelected(optionToSelect);
					onValueChange?.(optionToSelect);
				}
			}

			if (event.key === "Escape") {
				input.blur();
			}
		},
		[isOpen, options, onValueChange],
	);

	const handleBlur = useCallback(() => {
		setOpen(false);
		setInputValue(selected?.label || "");
	}, [selected]);

	const handleSelectOption = useCallback(
		(selectedOption: Option) => {
			setInputValue(selectedOption.label);
			setSelected(selectedOption);
			onValueChange?.(selectedOption);
			// Blur the input after selecting
			setTimeout(() => inputRef.current?.blur(), 0);
		},
		[onValueChange],
	);

	const handleClear = () => {
		setInputValue("");
		setSelected(undefined);
		setOpen(false);
		onValueChange?.(undefined as any);
	};

	const handleChange = (value: string) => {
		setInputValue(value);
		onInputChange?.(value);
		if (!isOpen) {
			setOpen(true);
		}
	};

	return (
		<CommandPrimitive onKeyDown={handleKeyDown}>
			<div ref={containerRef} className={cn("relative", className)}>
				<CommandInput
					ref={inputRef as any}
					value={inputValue}
					onValueChange={handleChange}
					onBlur={handleBlur}
					onFocus={() => setOpen(true)}
					placeholder={placeholder}
					disabled={disabled}
					className="text-base"
				/>
				{isClearEnabled && selected && (
					<Button
						size="icon"
						type="button"
						className="-translate-y-1/2 absolute top-1/2 right-2 h-6 w-6"
						onClick={handleClear}
					>
						<X className="h-4 w-4" />
					</Button>
				)}
			</div>
			<div className="relative">
				<div
					ref={dropdownRef}
					className={cn(
						"fade-in-0 zoom-in-95 absolute z-40 w-full animate-in rounded-xl bg-background outline-hidden",
						isOpen ? "block" : "hidden",
					)}
					style={{
						[shouldOpenUpward ? "bottom" : "top"]: shouldOpenUpward
							? "calc(100% + 3rem)"
							: "100%",
					}}
				>
					<CommandList
						className={cn("rounded-lg ring-1 ring-border", dropdownClassName)}
					>
						{isLoading ? (
							<CommandPrimitive.Loading>
								<div className="p-1">
									<Skeleton className="h-8 w-full" />
								</div>
							</CommandPrimitive.Loading>
						) : null}
						{options.length > 0 && !isLoading ? (
							<CommandGroup>
								{options?.map((option, index) => {
									const isSelected = selected?.value === option.value;
									return (
										<CommandItem
											key={`${option.value}-${index}`}
											value={option.label}
											onMouseDown={(event) => {
												event.preventDefault();
												event.stopPropagation();
											}}
											onSelect={() => handleSelectOption(option)}
											className={cn(
												"z-50 flex w-full items-center gap-2",
												!isSelected ? "pl-8" : null,
											)}
										>
											{isSelected ? <Check className="w-4" /> : null}
											{option.label}
										</CommandItem>
									);
								})}
							</CommandGroup>
						) : null}
						{!isLoading && options.length === 0 ? (
							<CommandPrimitive.Empty className="select-none rounded-sm px-2 py-3 text-center text-sm">
								{emptyMessage}
							</CommandPrimitive.Empty>
						) : null}
					</CommandList>
				</div>
			</div>
		</CommandPrimitive>
	);
};
