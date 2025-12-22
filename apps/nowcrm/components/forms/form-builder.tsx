// contactsapp/components/forms/FormBuilder.tsx
"use client";

import {
	DndContext,
	type DragEndEvent,
	DragOverlay,
	type DragStartEvent,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	arrayMove,
	SortableContext,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
	Building,
	Calendar,
	CheckSquare,
	ChevronDown,
	Eye,
	FileBarChart,
	FileText,
	GripVertical,
	Hash,
	ImageIcon,
	List,
	Loader2,
	Mail,
	MessageSquare,
	PersonStanding,
	Phone,
	Plus,
	Save,
	Trash2,
	Upload,
	User,
	X,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { EnhancedInput } from "@/components/quick-write/enhanced-input";
import { EnhancedTextarea } from "@/components/quick-write/enhanced-textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// --- Actions & Types ---
import { getFormBySlugOrId } from "@/lib/actions/forms/get-form";
import {
	eraseCoverOrLogo,
	updateForm,
	uploadCoverOrLogo,
} from "@/lib/actions/forms/update-form";

import { cn } from "@/lib/utils";

// --- Main Component ---

interface FormBuilderProps {
	formId: DocumentId;
}

const FormBuilder: React.FC<FormBuilderProps> = ({ formId }) => {
	const [loading, setLoading] = useState<boolean>(true);
	const [saving, setSaving] = useState<boolean>(false);
	const [savingActive, setSavingActive] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [formData, setFormData] = useState<FormEntity | null>(null);
	const [activeId, setActiveId] = useState<string | null>(null);
	const [selectedField, setSelectedField] = useState<FormEntityItem | null>(
		null,
	);
	const [showPreviewButton, setShowPreviewButton] = useState(false);
	const [shareUrl, setShareUrl] = useState<string>("");

	const [rightTab, setRightTab] = useState<"field-settings" | "customization">(
		"customization",
	);

	// small helper
	const openFieldSettings = useCallback(
		() => setRightTab("field-settings"),
		[],
	);

	const nextTempIdRef = useRef<number>(-1);

	const initNextTempId = (items: FormEntityItem[]) => {
		const minNeg = items.reduce((min, it) => (it.id < min ? it.id : min), 0);
		// Always go one lower than the smallest negative id we have
		nextTempIdRef.current = Math.min(-1, minNeg - 1);
	};

	const getNextTempId = () => {
		const id = nextTempIdRef.current;
		nextTempIdRef.current = id - 1;
		return id;
	};

	const makeUniqueName = (base: string, existing: Set<string>) => {
		let candidate = base;
		let i = 2;
		while (existing.has(candidate)) {
			candidate = `${base}_${i}`;
			i += 1;
		}
		return candidate;
	};

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: { distance: 5 },
		}),
	);

	useEffect(() => {
		if (!formId) {
			setLoading(false);
			setError("No Form ID provided.");
			return;
		}
		let isMounted = true;
		const fetchForm = async () => {
			setLoading(true);
			setError(null);
			setFormData(null);
			setSelectedField(null);
			try {
				// Replace with your actual API call
				const response = await getFormBySlugOrId(formId, false);
				if (!isMounted) return;
				if (!response.success) {
					setError(response.errorMessage ?? "Error fetching form data");
				} else {
					const forms = response.data ?? [];
					if (forms.length === 0) {
						setError("Form not found");
					} else {
						const initialForm = {
							...forms[0],
							form_items: forms[0].form_items || [],
						};
						setFormData(initialForm);
						initNextTempId(initialForm.form_items);
					}
				}
			} catch (err) {
				console.error("Error fetching form:", err);
				if (isMounted)
					setError("An unexpected error occurred while loading the form.");
			} finally {
				if (isMounted) setLoading(false);
			}
		};
		fetchForm();
		return () => {
			isMounted = false;
		};
	}, [formId]);

	useEffect(() => {
		const generateShareUrl = async () => {
			if (formData?.documentId) {
				try {
					const url = await shareForm(formData.documentId, formData.slug);
					setShareUrl(url);
				} catch (error) {
					console.error("Failed to generate share URL:", error);
				}
			}
		};

		generateShareUrl();
	}, [formData?.documentId, formData?.slug]);

	useEffect(() => {
		if (formData?.form_items) {
			initNextTempId(formData.form_items);
		}
	}, [formData?.form_items]);

	const generateSlug = useCallback((name: string): string => {
		return name
			.toString()
			.normalize("NFKD") // split letters + diacritics
			.replace(/[\u0300-\u036f]/g, "") // remove diacritics
			.toLowerCase()
			.trim()
			.replace(/[^a-z0-9]+/g, "-") // non-alnum → dash
			.replace(/^-+|-+$/g, ""); // trim leading/trailing dashes
	}, []);

	const handleNameChange = useCallback(
		(name: string) => {
			setFormData((prevData) => {
				if (!prevData) return null;
				const newFormData = { ...prevData, name };
				if (!prevData.slug || prevData.slug === generateSlug(prevData.name)) {
					newFormData.slug = generateSlug(name);
				}
				return newFormData;
			});
		},
		[generateSlug],
	);

	const handleFormChange = useCallback(
		<K extends keyof FormEntity>(key: K, value: FormEntity[K]) => {
			setFormData((prevData) => {
				if (!prevData) return null;
				return { ...prevData, [key]: value };
			});
		},
		[],
	);

	const updateFormField = useCallback(
		(updatedField: FormEntityItem) => {
			setFormData((prevData) => {
				if (!prevData) return null;
				const updatedFields = prevData.form_items.map((field) =>
					field.id === updatedField.id ? updatedField : field,
				);
				if (selectedField && selectedField.id === updatedField.id) {
					setSelectedField(updatedField);
				}
				return { ...prevData, form_items: updatedFields };
			});
		},
		[selectedField],
	);

	const handleDragStart = (event: DragStartEvent) => {
		setActiveId(event.active.id as string);
		setSelectedField(null);
	};

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;
		setActiveId(null);
		if (!over || active.id === over.id || !formData) return;

		const oldIndex = formData.form_items.findIndex(
			(item) => item.id.toString() === active.id,
		);
		const newIndex = formData.form_items.findIndex(
			(item) => item.id.toString() === over.id,
		);
		if (oldIndex !== -1 && newIndex !== -1) {
			let newItems = arrayMove(formData.form_items, oldIndex, newIndex);

			// 🛠 Reassign ranks after move
			newItems = newItems.map((item, idx) => ({
				...item,
				rank: idx + 1,
			}));

			setFormData((prevData) =>
				prevData ? { ...prevData, form_items: newItems } : null,
			);
			toast.success("Field order updated");
		}
	};

	const addField = useCallback(
		(fieldType: string, label: string) => {
			const tempId = getNextTempId();

			const rawName = label
				.toLowerCase()
				.replace(/\s+/g, "_")
				.replace(/[^\w_]/g, "");

			const existingNames = new Set(
				(formData?.form_items || []).map((f) => f.name.toLowerCase()),
			);

			const uniqueName = makeUniqueName(rawName || "field", existingNames);

			// change any to FormEntity
			const newField: any = {
				id: tempId,
				name: uniqueName,
				type: fieldType as FormEntityItemType,
				label,
				options: [
					"select",
					"multi_checkbox",
					"multi_choice",
					"single_choice",
				].includes(fieldType)
					? ["Option 1", "Option 2"]
					: [],
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				rank: (formData?.form_items.length ?? 0) + 1,
				required: false,
				hidden: false,
			};

			setFormData((prevData) =>
				prevData
					? { ...prevData, form_items: [...prevData.form_items, newField] }
					: prevData,
			);

			setSelectedField(newField);
			openFieldSettings(); // <-- jump
			toast.success(`Added new "${label}" field`);
		},
		[formData?.form_items, openFieldSettings],
	);

	const deleteField = useCallback(
		(fieldId: number) => {
			setFormData((prevData) => {
				if (!prevData) return null;
				const fieldToDelete = prevData.form_items.find((f) => f.id === fieldId);
				if (!fieldToDelete) return prevData;
				const updatedFields = prevData.form_items.filter(
					(field) => field.id !== fieldId,
				);
				if (selectedField && selectedField.id === fieldId) {
					setSelectedField(null);
				}
				toast.success(`Field "${fieldToDelete.label}" removed`);
				return { ...prevData, form_items: updatedFields };
			});
		},
		[selectedField],
	);

	// Handler for immediate active state toggle
	const handleActiveToggle = async (checked: boolean) => {
		if (!formData) return;

		setSavingActive(true);
		// Optimistically update UI
		setFormData((prevData) =>
			prevData ? { ...prevData, active: checked } : null,
		);

		try {
			// Preserve existing form items to avoid deletion
			const currentItems = formData.form_items.map((item) => ({
				...(item.documentId ? { documentId: item.documentId } : {}),
				name: item.name,
				type: item.type,
				label: item.label,
				options: item.options,
				rank: item.rank,
				required: item.required ?? false,
				hidden: item.hidden ?? false,
			}));

			const response = await updateForm(
				formData.documentId,
				{ active: checked },
				currentItems,
			);
			if (!response.success) {
				// Revert on error
				setFormData((prevData) =>
					prevData ? { ...prevData, active: !checked } : null,
				);
				toast.error(response.errorMessage || "Failed to update active state");
			} else {
				toast.success(`Form ${checked ? "activated" : "deactivated"}`);
			}
		} catch (error: any) {
			// Revert on error
			setFormData((prevData) =>
				prevData ? { ...prevData, active: !checked } : null,
			);
			console.error("Error updating active state:", error);
			toast.error("Failed to update active state");
		} finally {
			setSavingActive(false);
		}
	};

	// inside contactsapp/components/forms/FormBuilder.tsx, in `handleSaveForm`:

	const handleSaveForm = async () => {
		if (!formData) {
			toast.error("No form data to save.");
			return;
		}
		setSaving(true);
		toast.loading("Saving form…", { id: "save" });

		try {
			console.log("Before save - items:", formData.form_items.length);
			console.log("Form data before save:", {
				keep_contact: formData.keep_contact,
				override_contact: formData.override_contact,
				form_view: formData.form_view,
			});
			// Strip media, id, and documentId from payload
			const {
				documentId: formId,
				id,
				form_items,
				logo,
				cover,
				slug,
				keep_contact,
				override_contact,
				form_view,
				createdAt,
				updatedAt,
				...regularFields
			} = formData;

			// 1) Use what the user typed, but trim minimal whitespace.
			const desiredSlug = (slug || "").trim();
			console.log("Desired slug:");
			console.log(desiredSlug);

			// 2) Verify uniqueness at system level.
			if (desiredSlug !== "") {
				const bySlug = await getFormBySlugOrId(desiredSlug, true, 100);
				console.log("By slug:", bySlug);
				const foundArray = bySlug.success ? bySlug.data?.length : null;
				console.log("found by the same slug", foundArray);

				if (Number(foundArray) - 1 >= 1) {
					console.error("Rejecting save!");
					toast.error(`Slug "${desiredSlug}" is already in use.`);
					setSaving(false);
					return;
				}
			}

			// change any to Form_FormEntity
			const payload: any = {
				...regularFields,
				slug: desiredSlug,
				keep_contact: keep_contact ?? false,
				override_contact: override_contact ?? false,
				form_view: form_view ?? false,
				submit_confirm_text: formData.submit_confirm_text ?? "",
				submission_success_text: formData.submission_success_text ?? "",
			};

			console.log("Payload being sent:", {
				keep_contact: payload.keep_contact,
				override_contact: payload.override_contact,
				form_view: payload.form_view,
			});

			// change to Custom_FormEntityItem
			const newFormItems: any[] = (form_items || []).map((item) => ({
				...(item.documentId ? { documentId: item.documentId } : {}),
				name: item.name,
				type: item.type,
				label: item.label,
				options: item.options,
				rank: item.rank,
				required: item.required ?? false,
				hidden: item.hidden ?? false,
				publishedAt: new Date(),
			}));

			console.log("Sending payload to updateForm:", payload, newFormItems);
			const response = await updateForm(formId, payload, newFormItems);

			if (!response.success) {
				throw new Error(response.errorMessage || "Unknown error");
			}

			// Re-fetch
			const fresh = await getFormBySlugOrId(formId, false);
			if (fresh.success && fresh.data?.length) {
				const fullForm = fresh.data[0];
				console.log("After refetch - items:", fullForm.form_items?.length);
				setFormData({
					...fullForm,
					form_items: fullForm.form_items || [],
				});
				toast.success("Form saved!", { id: "save" });
				setShowPreviewButton(true);
			} else {
				console.log(
					"After refetch (fallback) - items:",
					response.data?.form_items?.length,
				);
				setFormData({
					...response.data!,
					form_items: response.data!.form_items || [],
				});
				toast.success("Form saved! (partial data)", { id: "save" });
			}
		} catch (error: any) {
			console.error("Error saving form:", error);
			toast.error("Failed to save form.", { id: "save" });
		} finally {
			setSaving(false);
		}
	};

	// --- Render Logic ---
	if (loading)
		return (
			<div className="flex h-[calc(100vh-4rem)] items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
				<span className="ml-2">Loading Form...</span>
			</div>
		);
	if (error)
		return (
			<Card className="m-4">
				<CardHeader>
					<CardTitle className="text-destructive">Error</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-red-600">{error}</p>
				</CardContent>
			</Card>
		);
	if (!formData)
		return (
			<Card className="m-4">
				<CardHeader>
					<CardTitle>No Form Data</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground">
						Form data could not be loaded.
					</p>
				</CardContent>
			</Card>
		);

	return (
		<DndContext
			sensors={sensors}
			onDragStart={handleDragStart}
			onDragEnd={handleDragEnd}
		>
			<div className="flex h-[calc(100vh-4rem)] flex-col bg-muted/40">
				{/* Header */}
				<header className="flex h-14 items-center justify-between border-b bg-background px-4 lg:px-6">
					<div className="flex items-center gap-4">
						<h1
							className="truncate font-semibold text-lg"
							title={formData.name}
						>
							Form: {formData.name || "Untitled Form"}
						</h1>
						{formData?.documentId && (
							<Button
								variant="outline"
								size="sm"
								onClick={() => {
									const resultsUrl = RouteConfig.forms.results(
										formData.documentId,
									);
									const win = window.open(
										resultsUrl,
										"_blank",
										"noopener,noreferrer",
									);
									if (win) win.opener = null;
								}}
							>
								<FileBarChart className="mr-2 h-4 w-4" />
								<span className="hidden sm:inline">View Results</span>
							</Button>
						)}
					</div>

					<div className="flex items-center gap-4">
						{shareUrl && <EmbedDrawer pageUrl={shareUrl} />}

						{showPreviewButton && shareUrl && (
							<>
								<GETParamHelpModal
									shareUrl={shareUrl}
									fields={(formData?.form_items || []).map((f) => ({
										label: f.label,
										name: f.name,
										type: f.type,
									}))}
								/>
								<Button
									variant="secondary"
									size="sm"
									onClick={async () => {
										try {
											const previewWindow = window.open(
												shareUrl,
												"_blank",
												"noopener,noreferrer",
											);
											if (previewWindow) previewWindow.opener = null;
										} catch (error) {
											console.error("Failed to open preview:", error);
										}
									}}
								>
									<Eye className="h-4 w-4" />
									<span className="hidden md:inline">Preview Form</span>
								</Button>
							</>
						)}

						<div className="flex items-center gap-2">
							<Switch
								id="form-active"
								checked={formData.active}
								onCheckedChange={handleActiveToggle}
								disabled={savingActive || loading}
								aria-label="Form Active Status"
							/>
							<Label htmlFor="form-active" className="hidden text-sm md:inline">
								{savingActive ? "Saving..." : "Active"}
							</Label>
						</div>

						<Button
							onClick={handleSaveForm}
							disabled={saving || loading}
							size="sm"
						>
							{saving ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Save className="h-4 w-4" />
							)}
							<span className="hidden md:inline">
								{saving ? "Saving..." : "Save Form"}
							</span>
						</Button>
					</div>
				</header>

				{/* Main Content Area (3 Columns) */}
				<main className="flex flex-1 overflow-hidden">
					{/* Column 1: Field Types */}
					<div className="w-64 shrink-0 border-r bg-background">
						<ScrollArea className="h-full">
							<FormBuilderFieldTypes onAddField={addField} />
						</ScrollArea>
					</div>

					{/* Column 2: Form Builder Canvas */}
					<div className="relative flex-1 overflow-hidden">
						{" "}
						{/* Added relative for DragOverlay positioning */}
						<ScrollArea className="h-full p-4 lg:p-6">
							<div className="mx-auto max-w-3xl space-y-6">
								<Card>
									<CardHeader>
										<CardTitle>Form Details</CardTitle>
									</CardHeader>
									<CardContent className="space-y-4">
										<div>
											<Label htmlFor="form-name">Form Name</Label>
											<EnhancedInput
												id="form-name"
												value={formData.name}
												onChange={(e) => handleNameChange(e.target.value)}
												placeholder="Enter form name"
												className="mt-1"
											/>
										</div>
										<div>
											<Label htmlFor="form-slug">Slug</Label>
											<Input
												id="form-slug"
												value={formData.slug || ""}
												onChange={(e) =>
													handleFormChange("slug", e.target.value)
												} // free typing
												onBlur={(e) =>
													handleFormChange("slug", generateSlug(e.target.value))
												} // sanitize on blur
												placeholder="e.g., contact-us"
												className="mt-1"
											/>
											<p className="mt-1 text-muted-foreground text-xs">
												URL-friendly identifier. Auto-generated if left blank.
											</p>
										</div>
										<div>
											<Label htmlFor="form-description">Description</Label>
											<EnhancedTextarea
												id="form-description"
												value={formData.description || ""}
												onChange={(e) =>
													handleFormChange("description", e.target.value)
												}
												rows={3}
												placeholder="Optional: Describe the purpose of this form"
												className="mt-1"
											/>
										</div>

										<div>
											<Label htmlFor="submit-confirm-text">
												Confirmation Message (leave blank for no confirmation)
											</Label>
											<EnhancedTextarea
												id="submit-confirm-text"
												value={formData.submit_confirm_text || ""}
												onChange={(e) =>
													handleFormChange(
														"submit_confirm_text",
														e.target.value,
													)
												}
												rows={3}
												placeholder="Message sent after form is submitted (e.g., 'Thank you! We will get back to you soon.')"
												className="mt-1"
											/>
											<p className="mt-1 text-muted-foreground text-xs">
												This message will be sent to the contact's email if
												provided
											</p>
										</div>

										<div>
											<Label htmlFor="submit-confirm-text">
												Submit success message
											</Label>
											<EnhancedTextarea
												id="submit-success-text"
												value={formData.submission_success_text || ""}
												onChange={(e) =>
													handleFormChange(
														"submission_success_text",
														e.target.value,
													)
												}
												rows={3}
												placeholder="Message displayed after form is submitted (e.g., 'Thank you for taking part in this survey!')"
												className="mt-1"
											/>
											<p className="mt-1 text-muted-foreground text-xs">
												This message will be shown after the user submits the
												form.
											</p>
										</div>
									</CardContent>
								</Card>
								<Card>
									<CardHeader>
										<CardTitle>Form Fields</CardTitle>
									</CardHeader>
									<CardContent>
										{formData.form_items.length === 0 ? (
											<div className="flex h-40 flex-col items-center justify-center rounded-md border-2 border-muted-foreground/30 border-dashed p-8 text-center">
												<p className="font-medium text-muted-foreground text-sm">
													Click on a field type from the left panel to add it.
												</p>
												<p className="text-muted-foreground text-xs">
													Rearrange the fields as you need on this pane.
												</p>
											</div>
										) : (
											<SortableContext
												items={formData.form_items.map((item) =>
													item.id.toString(),
												)}
												strategy={verticalListSortingStrategy}
											>
												<div className="space-y-3">
													{formData.form_items.map((field) => (
														<SortableFormField
															key={field.id}
															field={field}
															isSelected={selectedField?.id === field.id}
															onClick={() => {
																setSelectedField(field);
																openFieldSettings(); // <-- jump
															}}
															onDelete={() => deleteField(field.id)}
														/>
													))}
												</div>
											</SortableContext>
										)}
									</CardContent>
								</Card>
							</div>
						</ScrollArea>
						<DragOverlay>
							{activeId &&
							formData?.form_items.find(
								(item) => item.id.toString() === activeId,
							) ? (
								<div className="cursor-grabbing rounded-md border bg-popover p-3 shadow-lg">
									<FormFieldDisplay
										field={
											formData.form_items.find(
												(item) => item.id.toString() === activeId,
											)!
										}
									/>
								</div>
							) : null}
						</DragOverlay>
					</div>

					{/* Column 3: Settings & Customization */}
					<div className="w-80 shrink-0 border-l bg-background">
						<Tabs
							value={rightTab}
							onValueChange={(v) => setRightTab(v as typeof rightTab)}
							className="flex h-full flex-col"
						>
							<TabsList className="shrink-0 rounded-none border-b">
								<TabsTrigger value="field-settings" className="flex-1">
									Field Settings
								</TabsTrigger>
								<TabsTrigger value="customization" className="flex-1">
									Form Settings
								</TabsTrigger>
							</TabsList>
							<TabsContent
								value="field-settings"
								className="flex-1 overflow-hidden p-0"
							>
								<ScrollArea className="h-full">
									{selectedField ? (
										<FormFieldSettings
											field={selectedField}
											onUpdate={updateFormField}
											onDelete={() => deleteField(selectedField.id)}
										/>
									) : (
										<div className="flex h-full flex-col items-center justify-center p-6 text-center">
											<p className="font-medium text-muted-foreground text-sm">
												Select a field
											</p>
											<p className="text-muted-foreground text-xs">
												Click on a field in the center panel to edit its
												settings.
											</p>
										</div>
									)}
								</ScrollArea>
							</TabsContent>
							<TabsContent
								value="customization"
								className="flex-1 overflow-hidden p-0"
							>
								<ScrollArea className="h-full">
									<FormBuilderCustomization
										formData={formData}
										onChange={handleFormChange}
									/>
								</ScrollArea>
							</TabsContent>
						</Tabs>
					</div>
				</main>
			</div>
		</DndContext>
	);
};

// --- Define FieldType Interface ---
interface FieldType {
	type: string;
	label: string;
	icon: React.ElementType;
	description: string;
}

// --- Define the actual field arrays ---
const coreFields: FieldType[] = [
	// Identity & Contact
	{
		type: "text",
		label: "First Name",
		icon: FileText,
		description: "User's First name",
	},
	{
		type: "text",
		label: "Last Name",
		icon: FileText,
		description: "User's Last name",
	},
	{
		type: "email",
		label: "Email",
		icon: Mail,
		description: "User's email address",
	},
	{
		type: "number",
		label: "Phone",
		icon: Hash,
		description: "User's contact number",
	},
	{
		type: "number",
		label: "Mobile Number",
		icon: Hash,
		description: "User's contact mobile number",
	},
	{
		type: "text",
		label: "Organization",
		icon: Building,
		description: "Company or Organization",
	},

	{
		type: "text",
		label: "Function",
		icon: Building,
		description: "Current Function or position",
	},
	{
		type: "number",
		label: "Age",
		icon: Hash,
		description: "User's age in years",
	},
	{
		type: "text",
		label: "Website",
		icon: FileText,
		description: "User's website URL",
	},

	// Address
	{
		type: "text",
		label: "Address Line 1",
		icon: FileText,
		description: "Street address or P.O. box",
	},
	{
		type: "text",
		label: "Location",
		icon: FileText,
		description: "City or locality",
	},
	{
		type: "text",
		label: "ZIP",
		icon: FileText,
		description: "ZIP, postal code, PLZ",
	},

	// Description
	{
		type: "text_area",
		label: "Short Bio",
		icon: MessageSquare,
		description: "Brief personal description",
	},

	// Booleans & Selections
	{
		type: "checkbox",
		label: "Subscribe to Newsletter",
		icon: CheckSquare,
		description: "Opt-in for updates",
	},
	{
		type: "single_choice",
		label: "Gender",
		icon: PersonStanding,
		description: "Select your gender",
	},
	{
		type: "multi_checkbox",
		label: "Language",
		icon: PersonStanding,
		description: "Multiple selections",
	},
	{
		type: "select",
		label: "Country",
		icon: ChevronDown,
		description: "Choose your country",
	},

	// Date & File
	{
		type: "date",
		label: "Preferred Contact Date",
		icon: Calendar,
		description: "Pick a suitable date",
	},
	{
		type: "attachment",
		label: "File",
		icon: Upload,
		description: "Upload any file",
	},

	{
		type: "attachment",
		label: "Resume",
		icon: Upload,
		description: "Upload your CV or Resume",
	},

	// Generic fallback (optional)
	{
		type: "text",
		label: "Text",
		icon: FileText,
		description: "Short text input",
	},
	{ type: "number", label: "Number", icon: Hash, description: "Numeric input" },
	{
		type: "text_area",
		label: "Text Area",
		icon: MessageSquare,
		description: "Multi-line text input",
	},
	{
		type: "checkbox",
		label: "Checkbox",
		icon: CheckSquare,
		description: "Single toggle",
	},
	{
		type: "select",
		label: "Dropdown",
		icon: List,
		description: "Single selection list",
	},
	{ type: "date", label: "Date", icon: Calendar, description: "Date picker" },
];

const customFields: FieldType[] = [
	{
		type: "multi_checkbox",
		label: "Checkboxes",
		icon: CheckSquare,
		description: "Multiple selections",
	},
	{
		type: "single_choice",
		label: "Radio Buttons",
		icon: List,
		description: "Single choice from options",
	},
	{
		type: "attachment",
		label: "File Upload",
		icon: Upload,
		description: "Allow file attachments",
	},
];

// --- Component Props Interface ---
interface FormBuilderFieldTypesProps {
	onAddField: (type: string, label: string) => void;
}

// --- The Component Implementation ---
const FormBuilderFieldTypes: React.FC<FormBuilderFieldTypesProps> = ({
	onAddField,
}) => {
	const [searchTerm, setSearchTerm] = useState("");

	// Filter fields based on search term (case-insensitive)
	const filterFields = (fields: FieldType[]) => {
		if (!searchTerm.trim()) return fields;
		const lowerCaseSearchTerm = searchTerm.toLowerCase();
		return fields.filter(
			(field) =>
				field.label.toLowerCase().includes(lowerCaseSearchTerm) ||
				field.description.toLowerCase().includes(lowerCaseSearchTerm) ||
				field.type.toLowerCase().includes(lowerCaseSearchTerm),
		);
	};

	const filteredCoreFields = filterFields(coreFields);
	const filteredCustomFields = filterFields(customFields);

	// Helper function to render a list of fields
	const renderFieldList = (fields: FieldType[], title: string) => (
		<div className="p-2">
			<h4 className="mb-1 px-2 py-1 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
				{title}
			</h4>
			{fields.length === 0 ? (
				<p className="p-4 text-center text-muted-foreground text-sm">
					No fields match "{searchTerm}"
				</p>
			) : (
				<div className="grid gap-1">
					{" "}
					{/* Use smaller gap */}
					{fields.map((field) => (
						<button
							type="button"
							key={`${field.type}-${field.label}`}
							className={cn(
								"flex w-full items-center gap-3 rounded-md border border-transparent p-2 text-left transition-colors", // Reduced padding slightly
								"hover:border-border hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
							)}
							onClick={() => onAddField(field.type, field.label)}
							title={`Add ${field.label} field`}
						>
							<field.icon
								className="h-5 w-5 flex-shrink-0 text-muted-foreground"
								aria-hidden="true"
							/>
							<div>
								<div className="font-medium text-sm">{field.label}</div>
								<div className="text-muted-foreground text-xs">
									{field.description}
								</div>
							</div>
						</button>
					))}
				</div>
			)}
		</div>
	);

	return (
		<div className="flex h-full flex-col">
			{/* Header with Search */}
			<div className="sticky top-0 z-10 border-b bg-background p-3">
				<Input
					placeholder="Search fields..."
					value={searchTerm}
					onChange={(e) => setSearchTerm(e.target.value)}
					className="w-full"
				/>
			</div>

			{/* Field Lists within ScrollArea handled by parent */}
			{/* Removed inner ScrollArea as parent handles it */}
			<div className="flex-1 py-2">
				{" "}
				{/* Added padding */}
				{renderFieldList(filteredCoreFields, "Preset Fields")}
				{filteredCoreFields.length > 0 && filteredCustomFields.length > 0 && (
					<Separator className="my-2" />
				)}
				{renderFieldList(filteredCustomFields, "Additional Fields")}
			</div>
		</div>
	);
};
// Add definitions for coreFields and customFields arrays here if not imported
// Example: const coreFields: FieldType[] = [ { type: "text", label: "Text", icon: FileText, description: "Short text input" }, ... ];

// --- Child Component: FormBuilderCustomization ---
interface FormBuilderCustomizationProps {
	formData: FormEntity;
	onChange: <K extends keyof FormEntity>(key: K, value: FormEntity[K]) => void;
	// Add props for actual image upload functions if needed
	// onUploadLogo: (file: File) => Promise<StrapiImageFormat | null>;
	// onUploadCover: (file: File) => Promise<StrapiImageFormat | null>;
}

const FormBuilderCustomization: React.FC<FormBuilderCustomizationProps> = ({
	formData,
	onChange,
}) => {
	const logoInputRef = useRef<HTMLInputElement>(null);
	const coverInputRef = useRef<HTMLInputElement>(null);

	const handleImageUpload = async (
		e: React.ChangeEvent<HTMLInputElement>,
		imageType: "logo" | "cover",
	) => {
		const file = e.target.files?.[0];
		if (!file) return;
		if (file.size > (imageType === "logo" ? 1 : 2) * 1024 * 1024) {
			toast.error(
				`${imageType === "logo" ? "Logo" : "Cover"} must be under ${imageType === "logo" ? "1" : "2"} MB.`,
			);
			return;
		}

		// Build FormData for the server action
		const fd = new FormData();
		fd.append("formIdRaw", String(formData.documentId));
		fd.append("files", file);

		try {
			// this uploads to Strapi (or whatever) and returns the URL
			const { id: assetId, url } = await uploadCoverOrLogo(fd, imageType); // destructure both

			onChange(imageType, {
				id: assetId, // keep media id so deletions work
				url,
				name: file.name,
				size: file.size,
				hash: `upload-${Date.now()}`,
				ext: "",
				path: file.name,
				height: 0,
				width: 0,
			} as Asset);

			toast.success(`${imageType === "logo" ? "Logo" : "Cover"} uploaded.`);
		} catch (err) {
			console.error("Upload failed:", err);
			toast.error("Upload failed. Try again.");
		} finally {
			e.target.value = "";
		}
	};

	const removeImage = async (imageType: "logo" | "cover") => {
		const currentImage = formData[imageType];
		if (!currentImage) return;

		try {
			if (currentImage?.id) {
				await eraseCoverOrLogo(currentImage as any, imageType);
			}

			if (currentImage.url?.startsWith("blob:")) {
				URL.revokeObjectURL(currentImage.url);
			}

			onChange(imageType, undefined as any);
			toast.success(
				`${imageType === "logo" ? "Logo" : "Cover"} image removed.`,
			);
		} catch (error) {
			console.error(`Failed to delete ${imageType}:`, error);
			toast.error(`Failed to remove ${imageType}. Please try again.`);
		}
	};

	return (
		/* ... JSX structure as defined before, with inputs for logo, cover, color, text, webhook, keep_contact, override_contact... */
		<div className="space-y-6 p-4 lg:p-6">
			<h3 className="mb-0 font-semibold text-lg">Form Settings</h3>
			<Separator />

			{/* Logo Upload */}
			<div className="space-y-2">
				<Label>Logo</Label>
				<input
					type="file"
					ref={logoInputRef}
					className="hidden"
					accept="image/png, image/jpeg, image/gif, image/webp"
					onChange={(e) => handleImageUpload(e, "logo")}
				/>
				{formData.logo?.url /* Logo Preview Card */ ? (
					<Card className="overflow-hidden">
						<CardContent className="p-3">
							<div className="flex items-center gap-3">
								<img
									src={formData.logo.url}
									alt={formData.logo.name || "Form logo preview"}
									className="h-14 w-14 rounded-md border bg-muted object-contain"
								/>
								<div className="min-w-0 flex-1">
									<p
										className="truncate font-medium text-sm"
										title={formData.logo.name.slice(0, 24)}
									>
										{formData.logo.name.slice(0, 24)}
									</p>
									<p className="text-muted-foreground text-xs">
										({(formData.logo.size / 1024).toFixed(1)} KB)
									</p>
								</div>
								<Button
									variant="ghost"
									size="icon"
									onClick={() => removeImage("logo")}
									aria-label="Remove logo"
								>
									<Trash2 className="h-4 w-4 text-destructive" />
								</Button>
							</div>
						</CardContent>
					</Card>
				) : (
					<Button
						variant="outline"
						className="w-full justify-start"
						onClick={() => logoInputRef.current?.click()}
					>
						<Upload className="mr-2 h-4 w-4" /> Upload Logo
					</Button>
				)}
				<p className="text-muted-foreground text-xs">
					Recommended: Square image, max 1MB.
				</p>
			</div>

			{/* Cover Photo Upload */}
			<div className="space-y-2">
				<Label>Cover Photo</Label>
				<input
					type="file"
					ref={coverInputRef}
					className="hidden"
					accept="image/png, image/jpeg, image/gif, image/webp"
					onChange={(e) => handleImageUpload(e, "cover")}
				/>
				{formData.cover?.url /* Cover Preview Card */ ? (
					<Card className="overflow-hidden">
						<CardContent className="relative p-0">
							<img
								src={formData.cover.url}
								alt={formData.cover.name || "Form cover preview"}
								className="h-32 w-full border-b object-cover"
							/>
							<Button
								variant="destructive"
								size="icon"
								className="absolute top-2 right-2 h-7 w-7"
								onClick={() => removeImage("cover")}
								aria-label="Remove cover photo"
							>
								<Trash2 className="h-4 w-4" />
							</Button>
							<div
								className="truncate bg-muted/50 p-2 text-muted-foreground text-xs"
								title={formData.cover.name.slice(0, 24)}
							>
								{formData.cover.name.slice(0, 24)} (
								{(formData.cover.size / 1024).toFixed(1)} KB)
							</div>
						</CardContent>
					</Card>
				) : (
					<Button
						variant="outline"
						className="w-full justify-start"
						onClick={() => coverInputRef.current?.click()}
					>
						<ImageIcon className="mr-2 h-4 w-4" /> Upload Cover Photo
					</Button>
				)}
				<p className="text-muted-foreground text-xs">
					Recommended: Wider image, max 2MB.
				</p>
			</div>

			{/* Brand Color */}
			<div className="space-y-2">
				<Label htmlFor="brand-color">Brand Color</Label>
				<div className="flex items-center gap-2">
					<Input
						id="brand-color-picker"
						type="color"
						value={formData.brand_color || "#000000"}
						onChange={(e) => onChange("brand_color", e.target.value)}
						className="h-9 w-10 cursor-pointer border-0 p-1"
						aria-label="Select brand color"
					/>
					<Input
						id="brand-color"
						type="text"
						value={formData.brand_color || ""}
						onChange={(e) => onChange("brand_color", e.target.value)}
						placeholder="#RRGGBB"
						className="flex-1"
						pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
						title="Enter a valid hex color code (e.g., #3b82f6)"
					/>
				</div>
				<p className="text-muted-foreground text-xs">
					Used for accents and button colors.
				</p>
			</div>

			{/* Submit Button Text */}
			<div className="space-y-2">
				<Label htmlFor="submit-text">Submit Button Text</Label>
				<Input
					id="submit-text"
					value={formData.submit_text || ""}
					onChange={(e) => onChange("submit_text", e.target.value)}
					placeholder="Submit"
				/>
			</div>

			{/* Webhook URL */}
			<div className="space-y-2">
				<Label htmlFor="webhook-url">Webhook URL</Label>
				<Input
					id="webhook-url"
					type="url"
					value={formData.webhook_url || ""}
					onChange={(e) => onChange("webhook_url", e.target.value)}
					placeholder="https://your-service.com/handler"
				/>
				<p className="text-muted-foreground text-xs">
					Optional: Send submission data via POST.
				</p>
			</div>

			{/* Keep Contacts Option */}
			<div className="space-y-2 pt-2">
				<div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
					<div className="space-y-0.5">
						<Label htmlFor="keep-contact" className="text-base">
							Save Contacts
						</Label>
						<p className="text-muted-foreground text-xs">
							Store contact info from submissions.
						</p>
					</div>
					<Switch
						id="keep-contact"
						checked={formData.keep_contact ?? false}
						onCheckedChange={(checked) => {
							console.log("🔄 keep_contact toggled:", checked);
							onChange("keep_contact", checked);
						}}
					/>
				</div>
			</div>

			<div className="space-y-2 pt-2">
				<div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
					<div className="space-y-0.5">
						<Label htmlFor="keep-contact" className="text-base">
							Overwrite Contact Data
						</Label>
						<p className="text-muted-foreground text-xs">
							Rewrites first_name, last_name and other fields
						</p>
					</div>
					<Switch
						id="override-contact"
						checked={formData.override_contact ?? false}
						onCheckedChange={(checked) => {
							console.log("🔄 override_contact toggled:", checked);
							onChange("override_contact", checked);
						}}
					/>
				</div>
			</div>

			{/* Form View Option */}
			<div className="space-y-2 pt-2">
				<div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
					<div className="space-y-0.5">
						<Label htmlFor="form-view" className="text-base">
							Enable Form View
						</Label>
						<p className="text-muted-foreground text-xs">
							When active, form will be displayed vertically without stepped
							view.
						</p>
					</div>
					<Switch
						id="form-view"
						checked={formData.form_view ?? false}
						onCheckedChange={(checked) => {
							console.log("🔄 form_view toggled:", checked);
							onChange("form_view", checked);
						}}
					/>
				</div>
			</div>
		</div>
	);
};

// --- Child Component: FormFieldDisplay ---
interface FormFieldDisplayProps {
	field: FormEntityItem;
	className?: string;
}

const FormFieldDisplay: React.FC<FormFieldDisplayProps> = ({
	field,
	className,
}) => {
	const getFieldIcon = (type: string): React.ReactNode => {
		/* ... icon switch logic ... */
		switch (type) {
			case "text":
				return <FileText className="h-4 w-4 text-inherit" />;
			case "email":
				return <Mail className="h-4 w-4 text-inherit" />;
			case "number":
				return <Hash className="h-4 w-4 text-inherit" />;
			case "phone":
				return <Phone className="h-4 w-4 text-inherit" />;
			case "text_area":
				return <MessageSquare className="h-4 w-4 text-inherit" />;
			case "date":
				return <Calendar className="h-4 w-4 text-inherit" />;
			case "checkbox":
				return <CheckSquare className="h-4 w-4 text-inherit" />; // Use CheckSquare for consistency
			case "select":
				return <List className="h-4 w-4 text-inherit" />; // Use List for select/dropdown
			case "name":
				return <User className="h-4 w-4 text-inherit" />;
			case "multi_checkbox":
				return <CheckSquare className="h-4 w-4 text-inherit" />;
			case "multi_choice":
				return <List className="h-4 w-4 text-inherit" />; // Use List for radio/multi-choice
			case "single_choice":
				return <List className="h-4 w-4 text-inherit" />;
			case "attachment":
				return <Upload className="h-4 w-4 text-inherit" />;
			default:
				return <FileText className="h-4 w-4 text-inherit" />;
		}
	};
	const getFieldTypeName = (type: string): string => {
		/* ... type name switch logic ... */
		switch (type) {
			case "text":
				return "Text";
			case "email":
				return "Email";
			case "number":
				return "Number";
			case "phone":
				return "Phone";
			case "text_area":
				return "Text Area";
			case "date":
				return "Date";
			case "checkbox":
				return "Checkbox";
			case "select":
				return "Dropdown";
			case "name":
				return "Name";
			case "multi_checkbox":
				return "Checkboxes";
			case "single_choice":
				return "Radio Buttons";
			case "multi_choice":
				return "Multiple Choice";
			case "attachment":
				return "File Upload, max size: 100M";
			default:
				return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
		}
	};
	return (
		/* ... JSX structure using getFieldIcon and getFieldTypeName ... */
		<div className={cn("flex items-start gap-3", className)}>
			<div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground">
				{getFieldIcon(field.type)}
			</div>
			<div className="min-w-0 flex-1">
				<div className="break-words font-medium text-sm" title={field.label}>
					{field.label || `Untitled ${getFieldTypeName(field.type)}`}
					{field.required && <span className="ml-1 text-destructive">*</span>}
					{field.hidden && (
						<span className="ml-1 text-muted-foreground">(hidden)</span>
					)}
				</div>
				<div className="text-muted-foreground text-xs">
					{getFieldTypeName(field.type)}
				</div>
			</div>
		</div>
	);
};

// --- Child Component: SortableFormField ---
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type {
	Asset,
	DocumentId,
	FormEntity,
	FormEntityItem,
	FormEntityItemType,
} from "@nowcrm/services";
import { shareForm } from "@/app/[locale]/crm/forms/components/columns/share-form";
import { RouteConfig } from "@/lib/config/routes-config";
import EmbedDrawer from "../embed-drawer";
import GETParamHelpModal from "./get-param-help";

interface SortableFormFieldProps {
	field: FormEntityItem;
	isSelected?: boolean;
	onClick: () => void;
	onDelete: () => void;
}

const SortableFormField: React.FC<SortableFormFieldProps> = ({
	field,
	isSelected,
	onClick,
	onDelete,
}) => {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: field.id.toString() });
	const style: React.CSSProperties = {
		transform: CSS.Transform.toString(transform),
		transition: transition || undefined,
		opacity: isDragging ? 0.5 : 1,
		zIndex: isDragging ? 10 : undefined,
	};
	const handleDeleteClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		onDelete();
	};

	return (
		/* ... JSX structure using FormFieldDisplay, GripVertical handle, Delete button ... */
		<div
			ref={setNodeRef}
			style={style}
			className={cn(
				"group relative flex cursor-pointer items-start gap-2 rounded-md border bg-background p-2.5 transition-shadow duration-150",
				isSelected
					? "border-primary shadow-md ring-1 ring-primary"
					: "hover:border-muted-foreground/30 hover:shadow-sm",
				isDragging && "shadow-xl",
			)}
			onClick={onClick}
			role="button"
			tabIndex={0}
			onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick()}
			aria-label={`Field: ${field.label}, Type: ${getFieldTypeName(field.type)}`}
		>
			{" "}
			{/* Added getFieldTypeName here */}
			<div
				{...attributes}
				{...listeners}
				className={cn(
					"mt-0.5 flex-shrink-0 cursor-grab touch-none p-1 text-muted-foreground",
					"rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
				)}
			>
				<GripVertical className="h-5 w-5" />
			</div>
			<FormFieldDisplay field={field} className="min-w-0 flex-1" />
			<Button
				variant="ghost"
				size="icon"
				className={cn(
					"absolute top-2.5 right-1.5 h-7 w-7 flex-shrink-0 text-muted-foreground opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100",
					"hover:bg-destructive/10 hover:text-destructive focus-visible:text-destructive focus-visible:opacity-100",
				)}
				onClick={handleDeleteClick}
				aria-label={`Delete field ${field.label}`}
				title="Delete Field"
				tabIndex={0}
			>
				<Trash2 className="h-4 w-4" />
			</Button>
		</div>
	);
};
// Add getFieldTypeName function definition here if not accessible globally
// Add getFieldTypeName function definition here if not accessible globally
const getFieldTypeName = (type: string): string => {
	switch (type) {
		case "text":
			return "Text";
		case "email":
			return "Email";
		case "number":
			return "Number";
		case "phone":
			return "Phone";
		case "text_area":
			return "Text Area";
		case "date":
			return "Date";
		case "checkbox":
			return "Checkbox";
		case "select":
			return "Dropdown";
		case "name":
			return "Name";
		case "multi_checkbox":
			return "Checkboxes";
		case "multi_choice":
			return "Multiple Choice"; // keep this as the multi-select label
		case "single_choice":
			return "Radio Buttons"; // new single-choice type
		case "attachment":
			return "File Upload, max size: 100M";
		default:
			return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
	}
};

// --- Child Component: FormFieldSettings ---
interface FormFieldSettingsProps {
	field: FormEntityItem;
	onUpdate: (field: FormEntityItem) => void;
	onDelete: () => void;
}

const FormFieldSettings: React.FC<FormFieldSettingsProps> = ({
	field,
	onUpdate,
	onDelete,
}) => {
	const [newOption, setNewOption] = useState<string>("");
	const handleFieldChange = <K extends keyof FormEntityItem>(
		key: K,
		value: FormEntityItem[K],
	) => {
		onUpdate({ ...field, [key]: value });
	};
	const addOption = () => {
		/* ... add logic with trim and duplicate check ... */
		const trimmedOption = newOption.trim();
		if (!trimmedOption) return;
		if (
			field.options.some(
				(opt: any) => opt.toLowerCase() === trimmedOption.toLowerCase(),
			)
		) {
			toast.error(`Option "${trimmedOption}" already exists.`);
			return;
		}
		handleFieldChange("options", [...field.options, trimmedOption]);
		setNewOption("");
	};
	const removeOption = (index: number) => {
		/* ... remove logic ... */
		const newOptions = field.options.filter((_: any, i: number) => i !== index);
		handleFieldChange("options", newOptions);
	};
	const updateOption = (index: number, value: string) => {
		/* ... update logic ... */
		const newOptions = [...field.options];
		newOptions[index] = value;
		handleFieldChange("options", newOptions);
	};
	const hasOptions =
		field.type === "select" ||
		field.type === "multi_checkbox" ||
		field.type === "multi_choice" ||
		field.type === "single_choice";

	return (
		/* ... JSX structure for settings form (Label, Name, Required, Options, Type, Hidden) ... */
		<div className="space-y-6 p-4 lg:p-6">
			<div className="flex items-center justify-between">
				<h3 className="font-semibold text-lg">Field Settings</h3>
				<Button
					variant="destructive"
					size="sm"
					onClick={onDelete}
					aria-label={`Delete ${field.label} field`}
				>
					<Trash2 className="mr-1.5 h-4 w-4" />
					Delete Field
				</Button>
			</div>
			<Separator />
			<div className="space-y-4">
				{/* Label Input */}
				<div className="space-y-1.5">
					<Label htmlFor={`field-label-${field.id}`}>Label</Label>
					<Input
						id={`field-label-${field.id}`}
						value={field.label}
						onChange={(e) => handleFieldChange("label", e.target.value)}
						placeholder="Enter field label"
					/>
				</div>
				{/* Name Input */}
				<div className="space-y-1.5">
					<Label htmlFor={`field-name-${field.id}`}>Name (Technical ID)</Label>
					<Input
						id={`field-name-${field.id}`}
						value={field.name}
						onChange={(e) =>
							handleFieldChange(
								"name",
								e.target.value
									.toLowerCase()
									.replace(/\s+/g, "_")
									.replace(/[^\w_]/g, ""),
							)
						}
						placeholder="e.g., first_name"
						className="font-mono text-xs"
					/>
					<p className="text-muted-foreground text-xs">
						Internal ID. Lowercase, no spaces.
					</p>
				</div>
				{/* Required Toggle */}
				<div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
					<Label
						htmlFor={`field-required-${field.id}`}
						className="cursor-pointer"
					>
						Required field
						<p className="font-normal text-muted-foreground text-xs">
							Must be filled to submit.
						</p>
					</Label>
					<Switch
						id={`field-required-${field.id}`}
						checked={field.required ?? false}
						onCheckedChange={(checked) =>
							handleFieldChange("required", checked)
						}
						aria-label="Mark field as required"
					/>
				</div>

				<div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
					<Label
						htmlFor={`field-hidden-${field.id}`}
						className="cursor-pointer"
					>
						Hidden field
						<p className="font-normal text-muted-foreground text-xs">
							Field will not be shown in the form but still exists in
							submissions.
						</p>
					</Label>
					<Switch
						id={`field-hidden-${field.id}`}
						checked={field.hidden ?? false}
						onCheckedChange={(checked) => handleFieldChange("hidden", checked)}
						aria-label="Mark field as hidden"
					/>
				</div>

				{/* Options Section (Conditional) */}
				{hasOptions && (
					<div className="space-y-3 rounded-lg border p-4 shadow-sm">
						<Label className="font-medium">Options</Label>
						{field.options.length > 0 ? (
							<div className="max-h-60 space-y-2 overflow-y-auto pr-2">
								{field.options.map((option: any, index: any) => (
									<div key={index} className="flex items-center gap-2">
										<Input
											value={option}
											onChange={(e) => updateOption(index, e.target.value)}
											placeholder={`Option ${index + 1}`}
											aria-label={`Option ${index + 1} value`}
											className="flex-1"
										/>
										<Button
											variant="ghost"
											size="icon"
											onClick={() => removeOption(index)}
											className="h-8 w-8 text-muted-foreground hover:text-destructive"
											aria-label={`Remove option ${index + 1}`}
										>
											<X className="h-4 w-4" />
										</Button>
									</div>
								))}
							</div>
						) : (
							<p className="py-2 text-center text-muted-foreground text-sm">
								No options added yet.
							</p>
						)}
						<div className="flex gap-2 border-t pt-2">
							<Input
								placeholder="Add new option"
								value={newOption}
								onChange={(e) => setNewOption(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										e.preventDefault();
										addOption();
									}
								}}
								aria-label="New option value"
							/>
							<Button
								onClick={addOption}
								variant="secondary"
								size="icon"
								aria-label="Add new option"
							>
								<Plus className="h-4 w-4" />
							</Button>
						</div>
						<p className="text-muted-foreground text-xs">
							Define choices. Press Enter or '+' to add.
						</p>
					</div>
				)}
				{/* Field Type Info */}
				<div className="pt-2">
					<Label className="mb-1 block font-medium text-muted-foreground text-xs">
						Field Type
					</Label>
					<Badge variant="outline" className="font-mono text-xs">
						{field.type}
					</Badge>
				</div>
			</div>
		</div>
	);
};

// Export the main component
export default FormBuilder;
