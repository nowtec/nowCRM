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
import PreviousImportsModal from "./components/previous-import-modal";
import { contactCSVTemplateFields } from "./templates/organization-csv-fields";

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
	const [open, setOpen] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isPreviousImportsOpen, setIsPreviousImportsOpen] = useState(false);
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

		if (file) {
			Papa.parse(file, {
				preview: 5,
				complete: (results) => {
					if (
						results.data &&
						Array.isArray(results.data) &&
						results.data.length > 1
					) {
						const [headers, ...rows] = results.data as string[][];

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
						setError("No headers or data found in CSV");
					}
					setIsLoading(false);
				},
				error: () => {
					setError("Failed to parse CSV headers");
					setIsLoading(false);
				},
			});
		}
	}, []);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: {
			"text/csv": [".csv"],
		},
		multiple: false,
	});

	const handleCancelImport = () => {
		setCSVData(null);
		setFileInfo(null);
		setColumnMapping({});
		setRequiredColumns([]);
		setSelectedColumns([]);
		setHasConfiguredMapping(false);
		setIsMappingModalOpen(false);
		toast.success("Import canceled");
	};

	const toggleColumn = (column: string) => {
		setSelectedColumns((current) =>
			current.includes(column)
				? current.filter((c) => c !== column)
				: [...current, column],
		);
	};

	const handleSubmit = async () => {
		if (!fileInfo || !Object.keys(columnMapping).length) {
			toast.error("Missing mapping or file.");
			return;
		}

		setIsSubmitting(true);

		try {
			const formData = new FormData();

			formData.append("file", fileInfo.file);
			formData.append("filename", fileInfo.name);
			formData.append("type", "organizations");
			formData.append("mapping", JSON.stringify(columnMapping));
			formData.append("requiredColumns", JSON.stringify(requiredColumns));
			formData.append("selectedColumns", JSON.stringify(selectedColumns));

			const mappedHeaders = Object.entries(columnMapping)
				.filter(([_, value]) => value && value.trim() !== "")
				.map(([key]) => key);

			const extraColumns =
				csvData?.headers.filter((h) => !mappedHeaders.includes(h)) || [];

			formData.append("extraColumns", JSON.stringify(extraColumns));

			await uploadCSV(formData);

			toast.success("CSV import started!");

			setTimeout(() => {
				setCSVData(null);
				setFileInfo(null);
				setColumnMapping({});
				setRequiredColumns([]);
				setSelectedColumns([]);
			}, 2000);
		} catch (e) {
			toast.error("Upload failed");
			console.error(e);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleMappingComplete = (
		mappings: Record<string, string>,
		newFileName: string,
		deletedColumns: string[],
	) => {
		setDeletedColumns(deletedColumns);
		if (fileInfo && newFileName !== fileInfo.name) {
			setFileInfo({
				...fileInfo,
				name: newFileName,
			});
		}

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
			setValidation(validateCSVData(csvData, requiredColumns, columnMapping));
			console.log({
				requiredColumns,
				selectedColumns,
				result: validateCSVData(csvData, requiredColumns, columnMapping),
			});
		}
	}, [csvData, requiredColumns, selectedColumns]);

	const downloadExampleCSV = () => {
		// Use the contactCSVTemplateFields directly from the import
		const headers = contactCSVTemplateFields;

		const exampleData = [
			[
				"john@example.com", // email
				"John Doe", // name
				"123 Example Street", // address_line1
				"Jane Smith", // contact_person
				"Zurich", // location
				"Weekly", // frequency
				"Online", // media_type
				"8000", // zip
				"Switzerland", // country
				"https://example.com", // url
				"Non-profit", // organization_type
				"https://twitter.com/example", // twitter_url
				"https://facebook.com/example", // facebook_url
				"@example_whatsapp", // whatsapp_channel
				"https://linkedin.com/in/example", // linkedin_url
				"@example_telegram", // telegram_url
				"https://t.me/examplechannel", // telegram_channel
				"https://instagram.com/example", // instagram_url
				"https://tiktok.com/@example", // tiktok_url
				"+41791234567", // whatsapp_phone
				"+41441234567", // phone
				"Media,Local", // tag
				"Local media outlet", // description
				"ZH", // canton
				"de", // language
				"de", // locale
				"new", // status
				"Official registry, Website", // sources
				"Media & Broadcasting", // industry
				"Zurich",
				"100 employees",
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
							CSV Import Organizations
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

							<div className="flex justify-end gap-2">
								{!hasConfiguredMapping && (
									<Button
										onClick={() => setIsMappingModalOpen(true)}
										disabled={
											!validation.hasRequiredColumns ||
											isSubmitting ||
											requiredColumns.length === 0
										}
										className="mr-2 min-w-[200px]"
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
										Object.keys(columnMapping).length === 0
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
