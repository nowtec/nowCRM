"use client";

import type {
	Asset,
	createAdditionalComposition,
	DocumentId,
} from "@nowcrm/services";
import type { Editor as EditorType } from "@tiptap/react";
import {
	AlertCircle,
	Archive,
	CheckCircle2,
	Code2,
	Eye,
	FileText,
	ImageIcon,
	Info,
	Music,
	Paperclip,
	RefreshCw,
	Upload,
	Video,
	WrapTextIcon,
	X,
} from "lucide-react";
import Link from "next/link";
import { useMessages } from "next-intl";
import { useEffect, useRef, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import toast from "react-hot-toast";
import Editor from "@/components/editor/editor-client";
import EventTable from "@/components/events/event-table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import {
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import SendToChannelButton from "../../../../../../../components/send-to-channels/send-to-channel";
import { FileUploadHandler } from "../../../../../../../components/uploaders/file-uploader-handler";
import { AnalyticsSection } from "../analytics/email-analytics";
import { channelAnalyticsConfigs } from "../analytics/metrics";
import { ResultPreview } from "../result-preview";
import { renderWithMentions } from "./render-with-mentions";

interface ChannelTab {
	id: string;
	label: string;
	channelName: string;
	status: string;
	maximum_content_lenght: number;
	remove_html: boolean;
}

interface CompositionChannelContentProps {
	composition_id: DocumentId;
	tab: ChannelTab;
	form: UseFormReturn<any>;
	isEditing: boolean;
	formItemIndex: number;
	itemId: DocumentId;
	onRegenerate: (
		itemId: DocumentId,
		formItemIndex: number,
		data: createAdditionalComposition,
	) => any;
	attached_files?: Asset[];
	fileType: string;
	textType: "text" | "html";
}

interface UIAsset extends Asset {
	isNew?: boolean;
	file?: File;
}

const getFileIcon = (mimeType: string) => {
	if (mimeType.startsWith("image/")) return ImageIcon;
	if (mimeType.startsWith("video/")) return Video;
	if (mimeType.startsWith("audio/")) return Music;
	if (mimeType.includes("zip") || mimeType.includes("rar")) return Archive;
	return FileText;
};

export function CompositionChannelContent({
	tab,
	form,
	isEditing,
	formItemIndex,
	composition_id,
	itemId,
	onRegenerate,
	fileType,
	textType,
	attached_files = [],
}: CompositionChannelContentProps) {
	const t = useMessages().Composer.channelContent;
	const [previewOpen, setPreviewOpen] = useState(false);
	const [stagedFiles, setStagedFiles] = useState<UIAsset[]>([]);
	const [filesToDelete, setFilesToDelete] = useState<number[]>([]);
	const [newFiles, setNewFiles] = useState<File[]>([]);
	const [isRegenerating, setIsRegenerating] = useState(false);
	const [regenerated, setRegenerated] = useState("");
	const [showHtmlEditor, setShowHtmlEditor] = useState(false);
	const [htmlContent, setHtmlContent] = useState("");

	const key = tab.channelName.toLowerCase();
	const analyticsConfig = channelAnalyticsConfigs.find(
		(c) => c.channelName === key,
	);
	const result = form.watch(`composition_items.${formItemIndex}.result`);
	const lengthConstraintPrompt = `Ensure the output does not exceed ${tab.maximum_content_lenght} characters, including spaces and punctuation. Focus on clarity and brevity.`;

	const editorRef = useRef<{ editor: EditorType | null } | null>(null);
	useEffect(() => {
		if (editorRef.current?.editor) {
			console.log(editorRef.current.editor.commands.setContent(regenerated));
		}
	}, [regenerated]);

	// Sync HTML content with editor content
	useEffect(() => {
		const currentResult = form.watch(
			`composition_items.${formItemIndex}.result`,
		);
		if (currentResult && currentResult !== htmlContent) {
			setHtmlContent(currentResult);
		}
	}, [form.watch(`composition_items.${formItemIndex}.result`), formItemIndex]);

	useEffect(() => {
		clearFileStates();

		if (attached_files && attached_files.length > 0) {
			setStagedFiles(attached_files as UIAsset[]);
		}
	}, [attached_files]);

	const clearFileStates = () => {
		setStagedFiles([]);
		setFilesToDelete([]);
		setNewFiles([]);
	};

	useEffect(() => {
		if (!isEditing) {
			clearFileStates();

			if (attached_files && attached_files.length > 0) {
				setStagedFiles(attached_files as UIAsset[]);
			}
		}
	}, [isEditing, attached_files]);

	useEffect(() => {
		form.setValue(
			`composition_items.${formItemIndex}.attached_files`,
			stagedFiles,
		);
		form.setValue(
			`composition_items.${formItemIndex}.files_to_delete`,
			filesToDelete,
		);
		form.setValue(`composition_items.${formItemIndex}.new_files`, newFiles);
	}, [stagedFiles, filesToDelete, newFiles, form, formItemIndex]);

	const handleRegenerate = async () => {
		const composition = form.getValues();
		const additionalPrompt = form.watch(
			`composition_items.${formItemIndex}.additional_prompt`,
		);
		const itemId = form.watch(`composition_items.${formItemIndex}.documentId`);
		if (additionalPrompt) {
			try {
				setIsRegenerating(true);
				const data = {
					reference_result: composition.reference_result,
					model: composition.model,
					additional_prompt: additionalPrompt
						? `${additionalPrompt.trim()}\n\n${lengthConstraintPrompt}`
						: lengthConstraintPrompt,
					removeHtml: tab.remove_html,
					max_content_length: tab.maximum_content_lenght,
				};
				const newResult = await onRegenerate(itemId, formItemIndex, data);
				form.setValue(`composition_items.${formItemIndex}.result`, newResult);
				setRegenerated(newResult);
				toast.success(`${tab.channelName} ${t.regenerateToastSuccess}`);
			} catch (error) {
				toast.error(t.regenerateToastError);
				console.error(error);
			} finally {
				setIsRegenerating(false);
			}
		}
	};

	const handleFileRemove = (file: UIAsset, index: number) => {
		if (!file.isNew && file.id) {
			setFilesToDelete((prev) => [...prev, file.id as number]);
		}

		if (file.isNew && file.file) {
			setNewFiles((prev) => prev.filter((f) => f !== file.file));
		}

		setStagedFiles((prev) => prev.filter((_, i) => i !== index));
	};

	const handleFileAdd = (files: File[]) => {
		setNewFiles((prev) => [...prev, ...files]);

		const newUIAssets = files.map((file) => {
			const uiAsset: any = {
				id: -1 * Math.floor(Math.random() * 10000),
				name: file.name,
				alternativeText: null,
				caption: null,
				width: null,
				height: null,
				hash: "",
				ext: file.name.split(".").pop() || "",
				mime: file.type,
				size: file.size,
				url: URL.createObjectURL(file),
				previewUrl: URL.createObjectURL(file),
				provider: "local",
				formats: {
					large: {} as any,
					medium: {} as any,
					small: {} as any,
					thumbnail: {} as any,
				},
				provider_metadata: "",
				createdAt: new Date(),
				updatedAt: new Date(),
				isNew: true,
				file: file,
			};
			return uiAsset;
		});

		setStagedFiles((prev) => [...prev, ...newUIAssets]);
		toast.success(`${files.length} ${t.fileAddedToast}`);
	};

	const handleHtmlChange = (value: string) => {
		setHtmlContent(value);
		form.setValue(`composition_items.${formItemIndex}.result`, value);

		// Update the visual editor if it exists
		if (editorRef.current?.editor && !showHtmlEditor) {
			editorRef.current.editor.commands.setContent(value);
		}
	};

	const toggleHtmlEditor = () => {
		const currentResult = form.watch(
			`composition_items.${formItemIndex}.result`,
		);
		if (!showHtmlEditor) {
			// Switching to HTML editor - get current content from visual editor
			if (editorRef.current?.editor) {
				const editorHtml = editorRef.current.editor.getHTML();
				setHtmlContent(editorHtml);
			} else {
				setHtmlContent(currentResult || "");
			}
		} else {
			// Switching back to visual editor - update it with HTML content
			if (editorRef.current?.editor) {
				editorRef.current.editor.commands.setContent(htmlContent);
			}
		}
		setShowHtmlEditor(!showHtmlEditor);
	};

	const allowedMentions = [
		"@contact.email",
		"@contact.first_name",
		"@contact.last_name",
		"@contact.address_line1",
		"@contact.address_line2",
		"@contact.plz",
		"@contact.location",
		"@contact.canton",
		"@contact.language",
		"@contact.function",
		"@contact.phone",
		"@contact.mobile_phone",
		"@contact.contact_status",
		"@contact.salutation.name",
		"@contact.description",
		"@contact.gender",
		"@contact.country",
		"@contact.birth_date",
		"@contact.organization.name",
		"@contact.department.name",
		"@contact.keywords.name",
		"@contact.contact_interests.name",
	];

	return (
		<>
			<Card>
				<CardHeader className="pb-4">
					<div className="flex items-center justify-between">
						<div>
							<CardTitle>
								{tab.label} {t.content}
							</CardTitle>
						</div>
						{result && (
							<div className="flex items-center gap-2">
								<Popover>
									<PopoverTrigger asChild>
										<Button variant="outline" size="sm">
											<Info className="mr-2 h-4 w-4" />
											Variables
										</Button>
									</PopoverTrigger>
									<PopoverContent className="w-96" align="end">
										<div className="space-y-3">
											<h4 className="font-semibold text-sm">
												Available Contact Variables
											</h4>
											<p className="text-muted-foreground text-xs">
												Use these variables in your prompts to personalize
												messages:
											</p>
											<div className="max-h-96 space-y-1 overflow-y-auto text-xs">
												{allowedMentions.map((mention) => (
													<div
														key={mention}
														className="rounded bg-muted px-2 py-1 font-mono"
													>
														{mention}
													</div>
												))}
											</div>
											<Separator />
											<div className="space-y-1">
												<p className="font-semibold text-xs">Text Blocks</p>
												<p className="text-muted-foreground text-xs">
													Insert a text block by adding:
												</p>
												<div className="inline-flex rounded bg-muted px-2 py-1 font-mono text-xs">
													#text_block
												</div>
											</div>
										</div>
									</PopoverContent>
								</Popover>

								<Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
									<DialogTrigger asChild>
										<Button variant="outline" size="sm" disabled>
											<Eye className="mr-2 h-4 w-4" />
											{t.preview}
										</Button>
									</DialogTrigger>
									<DialogContent className="sm:max-w-[600px]">
										<ResultPreview result={result} />
									</DialogContent>
								</Dialog>

								<Button
									variant="outline"
									size="sm"
									className="ml-2 bg-transparent"
									type="button"
									onClick={handleRegenerate}
									disabled={isRegenerating}
								>
									{isRegenerating ? (
										<>
											<RefreshCw className="mr-2 h-4 w-4 animate-spin" />
											{t.regenerating}
										</>
									) : (
										<>
											<RefreshCw className="mr-2 h-4 w-4" />
											{t.regenerate}
										</>
									)}
								</Button>

								<SendToChannelButton
									channelName={tab.label}
									composition_id={composition_id}
								/>
							</div>
						)}
					</div>
				</CardHeader>
				<CardContent className="space-y-6">
					<FormField
						control={form.control}
						name={`composition_items.${formItemIndex}.result`}
						render={({ field }) => {
							const characterCount = field.value?.trimEnd().length || 0;
							const characterPercentage =
								(characterCount / tab.maximum_content_lenght) * 100;
							const isNearLimit = characterPercentage > 80;
							const isOverLimit = characterPercentage > 100;
							return (
								<FormItem>
									<div className="flex items-center justify-between">
										<FormLabel
											htmlFor={`result_${tab.id}`}
											className="font-medium text-base"
										>
											{t.resultLabel}
										</FormLabel>
										<div className="flex items-center gap-2">
											<Badge
												variant={
													isOverLimit
														? "destructive"
														: isNearLimit
															? "secondary"
															: "outline"
												}
												className="text-xs"
											>
												{characterCount} / {tab.maximum_content_lenght}
											</Badge>
											<TooltipProvider delayDuration={300}>
												<Tooltip>
													<TooltipTrigger asChild>
														<WrapTextIcon></WrapTextIcon>
													</TooltipTrigger>
													<TooltipContent side="top">
														Content might be trimmed to fit this channel's
														character limit.
													</TooltipContent>
												</Tooltip>
											</TooltipProvider>
										</div>
									</div>

									{/* Character count progress */}
									<div className="space-y-2">
										<Progress
											value={Math.min(characterPercentage, 100)}
											className={`h-2 ${isOverLimit ? "bg-red-100" : isNearLimit ? "bg-yellow-100" : "bg-gray-100"}`}
										/>
										{isOverLimit && (
											<Alert variant="destructive" className="py-2">
												<AlertCircle className="h-4 w-4" />
												<AlertDescription className="text-sm">
													Content exceeds maximum length by{" "}
													{characterCount - tab.maximum_content_lenght}{" "}
													characters
												</AlertDescription>
											</Alert>
										)}
									</div>

									<FormControl>
										<div className="relative">
											{isEditing ? (
												textType === "html" ? (
													<div className="space-y-2">
														<div className="flex justify-end">
															<Button
																type="button"
																variant="outline"
																size="sm"
																onClick={toggleHtmlEditor}
																className="flex items-center gap-2 bg-transparent"
															>
																{showHtmlEditor ? (
																	<>
																		<Eye className="h-4 w-4" />
																		Visual Editor
																	</>
																) : (
																	<>
																		<Code2 className="h-4 w-4" />
																		HTML Editor
																	</>
																)}
															</Button>
														</div>

														{/* Editor Container */}
														<div className="overflow-hidden rounded-lg border">
															{showHtmlEditor ? (
																<Textarea
																	value={htmlContent}
																	onChange={(e) =>
																		handleHtmlChange(e.target.value)
																	}
																	className="min-h-[400px] resize-none font-mono text-sm leading-relaxed focus:border-transparent focus:ring-2 focus:ring-blue-500"
																	placeholder="Enter HTML content here..."
																	rows={20}
																/>
															) : (
																<Editor
																	key={`result_${tab.id}-editing`}
																	value={field.value}
																	ref={editorRef}
																	onChange={field.onChange}
																	max_content={tab.maximum_content_lenght}
																/>
															)}
														</div>
													</div>
												) : (
													<Textarea
														id={`result_${tab.id}-editing`}
														key={`result_${tab.id}-editing`}
														value={field.value}
														maxLength={tab.maximum_content_lenght}
														onChange={field.onChange}
														className="min-h-[200px] resize-none text-base leading-relaxed focus:border-transparent focus:ring-2 focus:ring-blue-500"
														placeholder="Enter your content here..."
														rows={10}
													/>
												)
											) : textType === "html" ? (
												<div className="overflow-hidden rounded-lg border">
													<Editor
														key={`result_${tab.id}-looking`}
														value={field.value}
														ref={editorRef}
														max_content={tab.maximum_content_lenght}
														disableToolbar
														editable={false}
													/>
												</div>
											) : (
												<div className="min-h-[200px] rounded-lg border p-4">
													<p className="whitespace-pre-wrap text-base leading-relaxed">
														{field.value
															? renderWithMentions(field.value, allowedMentions)
															: "No content available"}
													</p>
												</div>
											)}
										</div>
									</FormControl>
									<FormMessage />
								</FormItem>
							);
						}}
					/>
					{tab.channelName !== "SMS" && (
						<>
							<Separator />
							<div className="space-y-4">
								<FormField
									control={form.control}
									name={`composition_items.${formItemIndex}.attached_files`}
									render={() => (
										<FormItem>
											<div className="flex items-center justify-between">
												<FormLabel
													htmlFor={`attachments_${tab.id}`}
													className="font-medium text-base"
												>
													{t.attachedFilesLabel}
												</FormLabel>
												<Badge variant="outline" className="text-xs">
													{stagedFiles.length} / 5 files
												</Badge>
											</div>

											<FormControl>
												<div className="space-y-4">
													{/* File Grid */}
													{stagedFiles.length > 0 && (
														<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
															{stagedFiles.map((file, index) => {
																const FileIcon = getFileIcon(file.mime);

																return (
																	<div
																		key={file.id || index}
																		className={`group relative rounded-lg border-2 border-dashed p-4 transition-all hover:shadow-md ${
																			file.isNew
																				? "border-green-300"
																				: "border-gray-100"
																		}`}
																	>
																		<div className="flex items-start gap-3">
																			<div className="flex-shrink-0">
																				<FileIcon className="h-8 w-8 text-current" />
																			</div>

																			<div className="min-w-0 flex-1">
																				<TooltipProvider delayDuration={300}>
																					<Tooltip>
																						<TooltipTrigger asChild>
																							<p className="truncate font-medium text-sm">
																								{file.name}
																							</p>
																						</TooltipTrigger>
																						<TooltipContent side="top">
																							{file.name}
																						</TooltipContent>
																					</Tooltip>
																				</TooltipProvider>

																				<div className="mt-1 flex items-center gap-2">
																					<p className="text-gray-500 text-xs">
																						{(file.size / 1024).toFixed(1)} KB
																					</p>
																					{file.isNew && (
																						<Badge
																							variant="secondary"
																							className="px-1.5 py-0.5 text-xs"
																						>
																							New
																						</Badge>
																					)}
																				</div>

																				{file.url && (
																					<Link
																						href={file.url}
																						target="_blank"
																						rel="noopener noreferrer"
																						className="mt-2 inline-flex items-center gap-1 text-xs hover:text-primary-800"
																					>
																						<Eye className="h-3 w-3" />
																						View file
																					</Link>
																				)}
																			</div>

																			{isEditing && (
																				<Button
																					type="button"
																					variant="ghost"
																					size="sm"
																					className="h-8 w-8 p-0 text-red-500 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-700 group-hover:opacity-100"
																					onClick={() =>
																						handleFileRemove(file, index)
																					}
																				>
																					<X className="h-4 w-4" />
																				</Button>
																			)}
																		</div>
																	</div>
																);
															})}
														</div>
													)}

													{/* Upload Area */}
													{isEditing && stagedFiles.length < 5 && (
														<div className="rounded-lg border-2 border-gray-300 border-dashed p-6 text-center transition-colors hover:border-gray-400">
															<Upload className="mx-auto mb-4 h-12 w-12 text-gray-400" />
															<FileUploadHandler
																onFileSelect={handleFileAdd}
																maxFiles={5 - stagedFiles.length}
																acceptedFileTypes={fileType}
															/>
															<p className="mt-2 text-gray-500 text-sm">
																You can upload {5 - stagedFiles.length} more
																file
																{5 - stagedFiles.length !== 1 ? "s" : ""}
															</p>
														</div>
													)}

													{stagedFiles.length >= 5 && isEditing && (
														<Alert>
															<CheckCircle2 className="h-4 w-4" />
															<AlertDescription>
																Maximum number of files reached (5/5)
															</AlertDescription>
														</Alert>
													)}

													{stagedFiles.length === 0 && !isEditing && (
														<div className="py-8 text-center text-gray-500">
															<Paperclip className="mx-auto mb-2 h-12 w-12 text-gray-300" />
															<p className="text-sm">No attachments</p>
														</div>
													)}
												</div>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						</>
					)}

					<input
						type="hidden"
						{...form.register(
							`composition_items.${formItemIndex}.files_to_delete`,
						)}
						value={JSON.stringify(filesToDelete)}
					/>
				</CardContent>
			</Card>

			<Card className="mt-4 pt-4">
				<CardContent>
					<FormField
						control={form.control}
						name={`composition_items.${formItemIndex}.additional_prompt`}
						render={({ field }) => (
							<FormItem>
								<FormLabel
									htmlFor={`additional_prompt_${tab.id}`}
									className="font-medium text-base"
								>
									{t.additionalPromptLabel}
								</FormLabel>
								<FormControl>
									{isEditing ? (
										<Textarea
											id={`additional_prompt_${tab.id}`}
											{...field}
											className="min-h-[120px] resize-none text-base leading-relaxed focus:border-transparent focus:ring-2"
											placeholder="Add specific instructions for content generation..."
											rows={8}
										/>
									) : (
										<div className="min-h-[120px] rounded-lg border p-4">
											<p className="whitespace-pre-wrap text-base leading-relaxed">
												{field.value || "No additional prompt provided"}
											</p>
										</div>
									)}
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</CardContent>
			</Card>
			{analyticsConfig ? (
				<AnalyticsSection
					key={analyticsConfig.channelName}
					compositionItemId={itemId}
					channelName={tab.channelName}
					title={analyticsConfig.title}
					metrics={analyticsConfig.metrics}
				/>
			) : (
				"No Analytics Provided"
			)}
			<EventTable compositionItemId={itemId} channelName={tab.channelName} />
		</>
	);
}
