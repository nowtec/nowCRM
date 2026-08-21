"use client";

import {
	Check,
	ChevronsUpDown,
	Download,
	FileWarning,
	Loader2,
	Upload,
} from "lucide-react";
import Papa from "papaparse";
import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import toast from "react-hot-toast";
import { AsyncSelect } from "@/components/autoComplete/async-select";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { uploadCSV } from "@/lib/actions/import/upload-csv";
import { cn } from "@/lib/utils";
import { CSVMappingModal } from "./components/csv-mapping-modal";
import PreviousImportsModal from "./components/prev-imports-modal";
import { contactCSVTemplateFields } from "./templates/contact-csv-fields";

interface CSVData {
	headers: string[];
	rows: string[][];
}

interface FileInfo {
	name: string;
	size: number;
	type: string;
	file: File;
}

interface ValidationResult {
	isValid: boolean;
	emptyRows: number[];
	hasRequiredColumns: boolean;
}

const PREVIEW_SLICE_BYTES = 100 * 1024;

function formatFileSize(bytes: number): string {
	if (bytes === 0) return "0 Bytes";
	const k = 1024;
	const sizes = ["Bytes", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

function validateCSVData(
	data: CSVData,
	requiredColumns: string[],
	columnMapping: Record<string, string>,
): ValidationResult {
	const mappedHeaders = Object.entries(columnMapping)
		.filter(([_csvHeader, templateField]) =>
			requiredColumns.includes(templateField),
		)
		.map(([csvHeader]) => csvHeader.toLowerCase());

	const headersLower = data.headers.map((h) => h.toLowerCase());
	const hasRequiredColumns = mappedHeaders.some((h) =>
		headersLower.includes(h),
	);

	const emptyRows = data.rows.reduce((acc: number[], row, idx) => {
		const hasValue = mappedHeaders.some((mh) => {
			const i = headersLower.indexOf(mh);
			return i !== -1 && !!row[i];
		});
		if (!hasValue) acc.push(idx + 1);
		return acc;
	}, []);

	return { isValid: hasRequiredColumns, hasRequiredColumns, emptyRows };
}

export default function Page() {
	const [csvData, setCSVData] = useState<CSVData | null>(null);
	const [error, setError] = useState<string>("");
	const [isLoading, setIsLoading] = useState(false);
	const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
	const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
	const [deletedColumns, setDeletedColumns] = useState<string[]>([]);
	const [subscribeAll, setSubscribeAll] = useState(false);
	const [open, setOpen] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isPreviousImportsOpen, setIsPreviousImportsOpen] = useState(false);
	const [listMode, setListMode] = useState<"new" | "existing" | null>(null);
	const [deduplicateByRequired, setDeduplicateByRequired] = useState(false);
	const [selectedList, setSelectedList] = useState<any>(null);
	const [columnMapping, setColumnMapping] = useState<Record<string, string>>(
		{},
	);
	const [hasConfiguredMapping, setHasConfiguredMapping] = useState(false);
	const [validation, setValidation] = useState<ValidationResult>({
		isValid: false,
		emptyRows: [],
		hasRequiredColumns: false,
	});
	const [requiredColumns, setRequiredColumns] = useState<string[]>([]);
	const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);

	const onDrop = useCallback((acceptedFiles: File[]) => {
		const file = acceptedFiles[0];
		setError("");
		setIsLoading(true);
		setSelectedColumns([]);

		if (!file) {
			setError("No file selected");
			setIsLoading(false);
			return;
		}
		const sliceFile = new File(
			[file.slice(0, PREVIEW_SLICE_BYTES)],
			file.name,
			{ type: file.type },
		);

		Papa.parse(sliceFile, {
			preview: 5,
			worker: true,
			complete: (results) => {
				const data = results.data as string[][];
				if (data.length > 1) {
					const [headers, ...rows] = data;
					setCSVData({ headers, rows });
					setSelectedColumns(headers);
					setRequiredColumns([]);
					setFileInfo({
						name: file.name,
						size: file.size,
						type: file.type,
						file,
					});
					setIsMappingModalOpen(true);
				} else {
					setError("No headers or data found in CSV preview");
				}
				setIsLoading(false);
			},
			error: (err) => {
				console.error("[Papa.parse ERROR]", err);
				setError(`Parsing error: ${err.message}`);
				setIsLoading(false);
			},
		});
	}, []);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: { "text/csv": [".csv"] },
		multiple: false,
	});

	const handleCancelImport = () => {
		resetImportState();
		toast.success("Import canceled");
	};

	const resetImportState = () => {
		setCSVData(null);
		setFileInfo(null);
		setColumnMapping({});
		setRequiredColumns([]);
		setSelectedColumns([]);
		setHasConfiguredMapping(false);
		setValidation({
			isValid: false,
			emptyRows: [],
			hasRequiredColumns: false,
		});
		setListMode(null);
		setSelectedList(null);
		setSubscribeAll(false);
		setDeduplicateByRequired(false);
		setIsMappingModalOpen(false);
	};
	const toggleColumn = (column: string) => {
		setSelectedColumns((current) =>
			current.includes(column)
				? current.filter((c) => c !== column)
				: [...current, column],
		);
	};

	const handleSubmit = () => {
		console.log("[handleSubmit] STATE", {
			listMode,
			selectedList,
			fileInfo,
			columnMapping,
			requiredColumns,
			selectedColumns,
			subscribeAll,
			deduplicateByRequired,
		});

		if (listMode === null) {
			toast.error("Please choose: create new list or select an existing one.");
			return;
		}

		if (listMode === "existing" && !selectedList) {
			toast.error("Please select a list.");
			return;
		}

		if (!fileInfo || !Object.keys(columnMapping).length) {
			toast.error("Missing mapping or file.");
			return;
		}

		setIsSubmitting(true);

		const formData = new FormData();

		formData.append("listMode", String(listMode));
		formData.append(
			"listId",
			listMode === "existing" && selectedList ? String(selectedList.value) : "",
		);

		formData.append("file", fileInfo.file);
		formData.append("filename", fileInfo.name);
		formData.append("type", "contacts");
		formData.append("mapping", JSON.stringify(columnMapping));
		formData.append("requiredColumns", JSON.stringify(requiredColumns));
		formData.append("selectedColumns", JSON.stringify(selectedColumns));
		formData.append("subscribeAll", subscribeAll.toString());
		formData.append("deduplicateByRequired", deduplicateByRequired.toString());

		const mappedHeaders = Object.entries(columnMapping)
			.filter(([_, value]) => value && value.trim() !== "")
			.map(([key]) => key);

		const extraColumns =
			csvData?.headers.filter((h) => !mappedHeaders.includes(h)) || [];

		formData.append("extraColumns", JSON.stringify(extraColumns));

		for (const [key, val] of formData.entries()) {
			console.log("FORMDATA:", key, val);
		}

		uploadCSV(formData)
			.then((res) => {
				if (!res.success) {
					console.error("[uploadCSV ERROR]", res.errorMessage);
					toast.error(res.errorMessage || "Upload failed");
					return;
				}
				toast.success("CSV import started!");
				setTimeout(() => {
					resetImportState();
				}, 2000);
			})
			.catch((e) => {
				console.error("[uploadCSV ERROR]", e);
				toast.error("Upload failed");
			})
			.finally(() => {
				setIsSubmitting(false);
			});
	};

	const handleMappingComplete = (
		mappings: Record<string, string>,
		newFileName: string,
		deletedColumns: string[],
	) => {
		if (fileInfo && newFileName !== fileInfo.name) {
			setFileInfo({
				...fileInfo,
				name: newFileName,
			});
		}
		setDeletedColumns(deletedColumns);
		setColumnMapping(
			Object.fromEntries(
				Object.entries(mappings).filter(
					([csvHeader]) => !deletedColumns.includes(csvHeader),
				),
			),
		);

		if (deletedColumns.length > 0) {
			setSelectedColumns((current) =>
				current.filter((col) => !deletedColumns.includes(col)),
			);
		}

		setIsMappingModalOpen(false);
		setHasConfiguredMapping(true);
	};

	useEffect(() => {
		if (csvData) {
			const result = validateCSVData(csvData, requiredColumns, columnMapping);
			setValidation(result);
		}
	}, [csvData, requiredColumns, selectedColumns, columnMapping]);

	const downloadExampleCSV = () => {
		// Use the contactCSVTemplateFields directly from the import
		const headers = contactCSVTemplateFields;

		const exampleData = [
			[
				"john@example.com",
				"John",
				"Doe",
				"123 Main St",
				"Apt 4B",
				"54321",
				"New York",
				"NY",
				"USA",
				"English",
				"Manager",
				"+1234567890",
				"+1987654321",
				"Dear Mr",
				"Male",
				"www.johndoe.com",
				"linkedin.com/johndoe",
				"facebook.com/johndoe",
				"twitter.com/johndoe",
				"1990-01-01",
				"ACME Corp",
				"Sales",
				"Experienced sales manager",
				"Technology",
				"p1",
				"closed",
				"Lead",
				"AI,CRM",
				"2025-03-20T14:30:00Z",
				"2020-07-15T09:00:00Z",
				"Gold",
				"Client",
				"Website",
				"Called on 2025-03-10",
				"Software",
				"2nd",
				"2 years 8 month",
				"Experienced sales manager",
				"Education",
				"Dr",
			],
		];

		const csv = Papa.unparse({
			fields: headers,
			data: exampleData,
		});

		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const link = document.createElement("a");
		if (link.download !== undefined) {
			const url = URL.createObjectURL(blob);
			link.setAttribute("href", url);
			link.setAttribute("download", "example.csv");
			link.style.visibility = "hidden";
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		}
	};

	return (
		<TooltipProvider>
			<div className="w-full max-w-full overflow-hidden">
				<div className="space-y-8 py-10 md:container">
					<div className="flex items-center justify-between">
						<h2 className="font-bold text-3xl tracking-tight">
							CSV Import Contacts
						</h2>
						<div className="flex gap-2">
							<Button
								onClick={() => setIsPreviousImportsOpen(true)}
								variant="outline"
							>
								View Previous Imports
							</Button>
							<Button onClick={downloadExampleCSV} variant="outline">
								<Download className="mr-2 h-4 w-4" />
								Download Example CSV
							</Button>
						</div>
					</div>
					<PreviousImportsModal
						isOpen={isPreviousImportsOpen}
						onClose={() => setIsPreviousImportsOpen(false)}
					/>
					<div
						{...getRootProps()}
						className={cn(
							"cursor-pointer rounded-lg border-2 border-dashed p-12 text-center transition-colors",
							isDragActive
								? "border-primary bg-primary/5"
								: "border-muted-foreground/25",
							error ? "border-destructive" : "",
						)}
					>
						<input {...getInputProps()} />
						{isLoading ? (
							<div className="flex flex-col items-center space-y-4">
								<Loader2 className="h-8 w-8 animate-spin text-primary" />
								<p className="text-muted-foreground text-sm">
									Processing CSV file...
								</p>
							</div>
						) : (
							<div className="flex flex-col items-center space-y-4">
								{fileInfo && !error ? (
									<div className="space-y-2">
										<p className="font-medium text-primary">{fileInfo.name}</p>
										<div className="flex items-center justify-center gap-x-4 text-muted-foreground text-sm">
											<span>{formatFileSize(fileInfo.size)}</span>
											<span>•</span>
											<span>{csvData?.headers.length || 0} columns</span>
											<span>•</span>
											<span>Click or drop to replace</span>
										</div>
									</div>
								) : (
									<>
										<Upload
											className={cn(
												"h-8 w-8",
												error ? "text-destructive" : "text-primary",
											)}
										/>
										{error ? (
											<div className="space-y-2">
												<div className="flex items-center justify-center space-x-2">
													<FileWarning className="h-5 w-5 text-destructive" />
													<p className="font-medium text-destructive">
														{error}
													</p>
												</div>
												<p className="text-muted-foreground text-sm">
													Please try again with a valid CSV file
												</p>
											</div>
										) : (
											<>
												<p className="font-medium">
													{isDragActive
														? "Drop your CSV file here"
														: "Drag & drop your CSV file here"}
												</p>
												<p className="text-muted-foreground text-sm">
													or click to select a file
												</p>
											</>
										)}
									</>
								)}
							</div>
						)}
					</div>

					{/* CSV Mapping Modal */}
					{fileInfo && csvData && (
						<CSVMappingModal
							isOpen={isMappingModalOpen}
							onClose={() => setIsMappingModalOpen(false)}
							fileName={fileInfo.name}
							csvHeaders={csvData.headers}
							onImport={handleMappingComplete}
						/>
					)}

					{csvData && (
						<div className="space-y-4">
							{!validation.hasRequiredColumns && requiredColumns.length > 0 && (
								<div className="rounded-lg border border-yellow-500 bg-yellow-50 p-4 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
									<div className="flex items-center space-x-2">
										<FileWarning className="h-5 w-5" />
										<p className="font-medium">Missing Required Columns</p>
									</div>
									<p className="mt-1 text-sm">
										The CSV file must contain at least one of these columns:{" "}
										{requiredColumns.join(", ")}
									</p>
								</div>
							)}

							{validation.hasRequiredColumns &&
								validation.emptyRows.length > 0 && (
									<div className="rounded-lg border border-yellow-500 bg-yellow-50 p-4 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
										<div className="flex items-center space-x-2">
											<FileWarning className="h-5 w-5" />
											<p className="font-medium">
												Warning: Incomplete Rows Detected
											</p>
										</div>
										<p className="mt-1 text-sm">
											Some rows will be skipped during import because they are
											missing all required columns ({requiredColumns.join(", ")}
											)
										</p>
									</div>
								)}
							<div className="flex items-center justify-end gap-4">
								{!hasConfiguredMapping && (
									<Button
										onClick={() => setIsMappingModalOpen(true)}
										className="min-w-[200px]"
									>
										Configure Mapping
									</Button>
								)}

								<Button
									onClick={handleCancelImport}
									variant="outline"
									disabled={isSubmitting}
									className="min-w-[200px]"
								>
									Cancel Import
								</Button>

								<Button
									onClick={handleSubmit}
									disabled={
										!validation.hasRequiredColumns ||
										isSubmitting ||
										requiredColumns.length === 0 ||
										Object.keys(columnMapping).length === 0 ||
										listMode === null ||
										(listMode === "existing" && !selectedList)
									}
									className="min-w-[200px]"
								>
									{isSubmitting ? (
										<>
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											Importing...
										</>
									) : (
										"Import CSV"
									)}
								</Button>
							</div>
						</div>
					)}

					{csvData && (
						<div className="space-y-4">
							<div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
								{/* Target List */}
								<div className="rounded-lg border bg-muted/50 p-4">
									<div className="mb-4">
										<h3 className="font-medium">Target List</h3>
									</div>

									<div className="flex flex-col gap-4">
										<Select
											value={listMode ?? ""}
											onValueChange={(val) => {
												setListMode(val as "new" | "existing");
												if (val === "new") {
													setSelectedList(null);
												}
											}}
										>
											<SelectTrigger className="w-full">
												<SelectValue placeholder="Choose an option" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="new">Create New List</SelectItem>
												<SelectItem value="existing">
													Select Existing List
												</SelectItem>
											</SelectContent>
										</Select>

										{listMode === "existing" && (
											<AsyncSelect
												serviceName="listsService"
												label="Existing Lists"
												onValueChange={setSelectedList}
												presetOption={selectedList}
												useFormClear={false}
											/>
										)}

										{listMode === "new" && (
											<p className="text-muted-foreground text-sm">
												A new list will be created for this import.
											</p>
										)}

										{(listMode === null ||
											(listMode === "existing" && !selectedList)) && (
											<p className="text-red-500 text-sm">
												Please select option for the target list
											</p>
										)}
									</div>
								</div>
								{/* Additional Options */}
								<div className="rounded-lg border bg-muted/50 p-4">
									<div className="mb-4">
										<h3 className="font-medium">Additional Options</h3>
									</div>

									<div className="flex flex-col gap-4">
										{/* Email Subscription */}
										<div className="flex items-center gap-2">
											<Switch
												id="subscribe-all"
												checked={subscribeAll}
												onCheckedChange={setSubscribeAll}
											/>
											<label
												htmlFor="subscribe-all"
												className="select-none text-sm"
											>
												Enable Email Subscription
											</label>
										</div>

										{/* Deduplication */}
										<div className="flex items-center gap-2">
											<Switch
												id="deduplicate-by-required"
												checked={deduplicateByRequired}
												onCheckedChange={setDeduplicateByRequired}
											/>
											<label
												htmlFor="deduplicate-by-required"
												className="select-none text-sm"
											>
												Deduplicate by Required Fields
											</label>

											<TooltipProvider>
												<Tooltip>
													<TooltipTrigger asChild>
														<div className="cursor-help rounded-full bg-muted p-1">
															<FileWarning className="h-3 w-3" />
															<span className="sr-only">
																Deduplication info
															</span>
														</div>
													</TooltipTrigger>
													<TooltipContent className="max-w-xs">
														<p>
															If enabled, duplicate rows are removed
															sequentially based on the required fields. The
															system first checks duplicates by the first field,
															then refines matches using the next required
															fields in order.
														</p>
													</TooltipContent>
												</Tooltip>
											</TooltipProvider>
										</div>
									</div>
								</div>
							</div>

							<div className="rounded-lg border bg-muted/50 p-4">
								<div className="mb-4 flex items-center justify-between">
									<h3 className="font-medium">
										Available Columns (
										{
											Object.entries(columnMapping).filter(
												([csvHeader, mappedField]) =>
													mappedField && !deletedColumns.includes(csvHeader),
											).length
										}
										)
									</h3>
									<Popover open={open} onOpenChange={setOpen}>
										<PopoverTrigger asChild>
											<Button
												variant="outline"
												role="combobox"
												aria-expanded={open}
												className="min-w-[200px] justify-between"
											>
												{selectedColumns.length} columns selected
												<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
											</Button>
										</PopoverTrigger>
										<PopoverContent className="w-[200px] p-0">
											<Command>
												<CommandInput placeholder="Search columns..." />
												<CommandList>
													<CommandEmpty>No column found.</CommandEmpty>
													<CommandGroup>
														{csvData.headers.map((column) => (
															<CommandItem
																key={column}
																onSelect={() => toggleColumn(column)}
															>
																<Check
																	className={cn(
																		"mr-2 h-4 w-4",
																		selectedColumns.includes(column)
																			? "opacity-100"
																			: "opacity-0",
																	)}
																/>
																{column}
															</CommandItem>
														))}
													</CommandGroup>
												</CommandList>
											</Command>
										</PopoverContent>
									</Popover>
								</div>
								<div className="flex flex-wrap gap-2">
									{contactCSVTemplateFields.map((field, idx) => {
										const isMapped = Object.entries(columnMapping).some(
											([csvHeader, mappedField]) =>
												mappedField === field &&
												!deletedColumns.includes(csvHeader),
										);

										return (
											<span
												key={idx}
												className={cn(
													"inline-flex items-center rounded-md px-2 py-1 font-medium text-xs ring-1 ring-inset transition-colors",
													isMapped
														? "bg-primary/10 text-primary ring-primary/20"
														: "bg-muted/50 text-muted-foreground ring-muted-foreground/20",
												)}
											>
												{field}
											</span>
										);
									})}
								</div>
							</div>
							{csvData && (
								<div className="rounded-lg border bg-muted/50 p-4">
									<div className="mb-4 flex items-center justify-between">
										<div className="flex items-center gap-2">
											<h3 className="font-medium">Required Columns</h3>
											<TooltipProvider>
												<Tooltip>
													<TooltipTrigger asChild>
														<div className="cursor-help rounded-full bg-muted p-1">
															<FileWarning className="h-3 w-3" />
															<span className="sr-only">
																Required columns info
															</span>
														</div>
													</TooltipTrigger>
													<TooltipContent className="max-w-xs">
														<p>
															Select columns that are required for validation. A
															row will be imported only if it has a value in at
															least one of these columns. If multiple columns
															are selected, having any one of them is
															sufficient.
														</p>
													</TooltipContent>
												</Tooltip>
											</TooltipProvider>
										</div>
										<span
											className={`text-sm ${
												requiredColumns.length === 0
													? "text-red-500"
													: "text-muted-foreground"
											} `}
										>
											{requiredColumns.length === 0
												? "Select columns that are required for each row"
												: `${requiredColumns.length} columns required`}
										</span>
									</div>
									<div className="flex flex-wrap gap-2">
										{Object.values(columnMapping)
											.filter(
												(field, idx, arr) =>
													field &&
													field.trim() !== "" &&
													Object.entries(columnMapping).some(
														([csvHeader, mappedField]) =>
															mappedField === field &&
															!deletedColumns.includes(csvHeader),
													) &&
													arr.indexOf(field) === idx,
											)
											.map((field, index) => (
												<span
													key={index}
													onClick={() => {
														setRequiredColumns((current) =>
															current.includes(field)
																? current.filter((c) => c !== field)
																: [...current, field],
														);
													}}
													className={cn(
														"inline-flex cursor-pointer items-center rounded-md px-2 py-1 font-medium text-xs ring-1 ring-inset transition-colors",
														requiredColumns.includes(field)
															? "bg-primary text-primary-foreground ring-primary"
															: "bg-muted/50 text-muted-foreground ring-muted-foreground/20",
													)}
												>
													{field}
												</span>
											))}
									</div>
									{requiredColumns.length === 0 && (
										<p className="mt-2 text-muted-foreground text-sm">
											Rows missing all required columns will be skipped during
											import.
										</p>
									)}
								</div>
							)}

							<div className="overflow-hidden rounded-lg border bg-muted/50 p-4">
								<div className="mb-4 flex items-center">
									<h3 className="font-medium">Preview Data</h3>
									<TooltipProvider>
										<Tooltip>
											<TooltipTrigger asChild>
												<div className="ml-3 cursor-help rounded-full bg-muted p-1">
													<FileWarning className="h-3 w-3" />
													<span className="sr-only">Preview data info</span>
												</div>
											</TooltipTrigger>
											<TooltipContent className="max-w-xs">
												<p>
													This preview shows the first 5 rows from your CSV file
													so you can confirm that the imported list and column
													mapping look correct before final import.
												</p>
											</TooltipContent>
										</Tooltip>
									</TooltipProvider>
								</div>

								<div className="overflow-x-auto" style={{ maxWidth: "100%" }}>
									<div style={{ minWidth: "100%", width: "max-content" }}>
										<Table>
											<TableHeader>
												<TableRow>
													{Object.keys(columnMapping)
														.filter(
															(header) => !deletedColumns.includes(header),
														)
														.map((header, index) => (
															<TableHead
																key={index}
																className="whitespace-nowrap"
															>
																{header}
															</TableHead>
														))}
												</TableRow>
											</TableHeader>
											<TableBody>
												{csvData.rows.slice(0, 5).map((row, rowIndex) => (
													<TableRow key={rowIndex}>
														{Object.keys(columnMapping)
															.filter(
																(header) => !deletedColumns.includes(header),
															)
															.map((header, cellIndex) => (
																<TableCell
																	key={cellIndex}
																	className="whitespace-nowrap"
																>
																	{row[csvData.headers.indexOf(header)]}
																</TableCell>
															))}
													</TableRow>
												))}
											</TableBody>
										</Table>
									</div>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</TooltipProvider>
	);
}
