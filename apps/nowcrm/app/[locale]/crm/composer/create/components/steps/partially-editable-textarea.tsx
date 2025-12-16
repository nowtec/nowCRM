"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface PartiallyEditableTextareaProps {
	value: string;
	onChange: (value: string) => void;
	rows?: number;
	className?: string;
	placeholder?: string;
}

type EditableRegion = {
	start: number;
	end: number;
	type: "bracket" | "userTask";
	content: string;
};

export function PartiallyEditableTextarea({
	value,
	onChange,
	rows = 20,
	className,
	placeholder,
}: PartiallyEditableTextareaProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [editableRegions, setEditableRegions] = useState<EditableRegion[]>([]);
	const [editableValues, setEditableValues] = useState<
		Record<number, string>
	>({});

	useEffect(() => {
		const regions: EditableRegion[] = [];

		const bracketRegex = /\[([^\]]*)\]/g;
		let match;
		while ((match = bracketRegex.exec(value)) !== null) {
			regions.push({
				start: match.index + 1, // After opening bracket
				end: match.index + match[0].length - 1, // Before closing bracket
				type: "bracket",
				content: match[1] || "", // Empty string if bracket is empty
			});
		}

		const userTaskMatch = value.match(/User Task:\s*([\s\S]*)/);
		if (userTaskMatch && userTaskMatch.index !== undefined) {
			const prefixEnd = userTaskMatch.index + userTaskMatch[0].indexOf(":") + 1;
			regions.push({
				start: prefixEnd,
				end: value.length,
				type: "userTask",
				content: value.substring(prefixEnd),
			});
		}

		regions.sort((a, b) => a.start - b.start);
		setEditableRegions(regions);

		const initialValues: Record<number, string> = {};
		regions.forEach((region, idx) => {
			initialValues[idx] = region.content;
		});
		setEditableValues(initialValues);
	}, [value]);

	const reconstructText = (updatedValues: Record<number, string>) => {
		let result = "";
		let lastIndex = 0;

		editableRegions.forEach((region, idx) => {
			if (region.type === "bracket") {
				result += value.substring(lastIndex, region.start - 1);
				result += "[";
				const bracketValue = updatedValues[idx] ?? region.content ?? "";
				result += bracketValue;
				result += "]";
				lastIndex = region.end + 1;
			} else if (region.type === "userTask") {
				result += value.substring(lastIndex, region.start);
				result += updatedValues[idx] ?? region.content ?? "";
				lastIndex = region.end;
			}
		});

		if (lastIndex < value.length) {
			result += value.substring(lastIndex);
		}

		return result;
	};

	const handleEditableChange = (regionIndex: number, newContent: string) => {
		const updated = { ...editableValues, [regionIndex]: newContent };
		setEditableValues(updated);

		const newText = reconstructText(updated);
		onChange(newText);
	};

	const renderContent = () => {
		if (editableRegions.length === 0) {
			return (
				<div className="text-muted-foreground whitespace-pre-wrap">
					{value || placeholder}
				</div>
			);
		}

		const parts: React.ReactNode[] = [];
		let lastIndex = 0;

		editableRegions.forEach((region, idx) => {
			if (region.type === "bracket") {
				const beforeText = value.substring(lastIndex, region.start - 1);
				if (beforeText) {
					parts.push(
						<span key={`locked-${idx}-before`} className="select-none text-muted-foreground whitespace-pre-wrap">
							{beforeText}
						</span>,
					);
				}
				const currentValue = editableValues[idx] ?? region.content ?? "";
				const safeValue = currentValue || "";
				const contentLength = safeValue.length;
				const charWidth = 8.5; 
				const padding = 18; 
				const baseWidth = contentLength > 0 
					? Math.ceil(contentLength * charWidth + padding)
					: 50;
				const inputWidth = Math.max(50, baseWidth);
				
				parts.push(
					<span
						key={`editable-wrapper-${idx}-${region.start}`}
						className="relative inline-block align-baseline"
					>
						<input
							key={`editable-bracket-${idx}-${region.start}`}
							type="text"
							value={safeValue}
							onChange={(e) => {
								const newValue = e.target.value;
								handleEditableChange(idx, newValue);
								const newLength = newValue.length;
								const charWidth = 8.5;
								const padding = 24;
								const newWidth = Math.max(50, newLength > 0 
									? Math.ceil(newLength * charWidth + padding)
									: 50);
								e.target.style.width = `${newWidth}px`;
							}}
							onFocus={(e) => {
								const val = e.target.value || "";
								const charWidth = 8.5;
								const padding = 18;
								const focusedWidth = val.length > 0
									? Math.max(50, Math.ceil(val.length * charWidth + padding))
									: 50;
								e.target.style.width = `${focusedWidth}px`;
								e.target.style.minWidth = "50px";
							}}
							onBlur={(e) => {
								const val = e.target.value || "";
								const charWidth = 8.5;
								const padding = 18;
								if (val.length === 0) {
									e.target.style.width = "50px";
								} else {
									const blurWidth = Math.ceil(val.length * charWidth + padding);
									e.target.style.width = `${Math.max(50, blurWidth)}px`;
								}
							}}
							placeholder=" "
							className="box-border inline-block min-w-[50px] align-baseline bg-accent/30 px-2 py-0.5 font-mono text-sm outline-none focus:bg-accent/60 focus:ring-2 focus:ring-ring focus:ring-offset-1 border border-dashed border-primary/30 focus:border-primary/60 rounded-sm cursor-text"
							style={{ 
								width: `${inputWidth}px`,
							}}
						/>
					</span>,
				);

				lastIndex = region.end + 1;
			} else if (region.type === "userTask") {
				const beforeText = value.substring(lastIndex, region.start);
				if (beforeText) {
					parts.push(
						<span key={`locked-${idx}-before`} className="select-none text-muted-foreground whitespace-pre-wrap">
							{beforeText}
						</span>,
					);
				}

				parts.push(
					<div key={`editable-wrapper-${idx}`} className="w-full">
						<textarea
							key={`editable-${idx}`}
							value={editableValues[idx] ?? region.content}
							onChange={(e) => handleEditableChange(idx, e.target.value)}
							className="min-h-[60px] w-full resize-none border-0 bg-transparent p-0 font-mono text-sm outline-none focus:bg-accent/50"
							rows={Math.max(3, (editableValues[idx] ?? region.content).split('\n').length)}
						/>
					</div>,
				);

				lastIndex = region.end;
			}
		});

		if (lastIndex < value.length) {
			const remainingText = value.substring(lastIndex);
			if (remainingText) {
				parts.push(
					<span key="locked-end" className="select-none text-muted-foreground whitespace-pre-wrap">
						{remainingText}
					</span>,
				);
			}
		}

		return <div className="whitespace-pre-wrap">{parts}</div>;
	};

	return (
		<div
			ref={containerRef}
			className={cn(
				"min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
				className,
			)}
		>
			{renderContent()}
		</div>
	);
}

