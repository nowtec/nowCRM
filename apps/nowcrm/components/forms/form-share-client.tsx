//contactsapp/components/forms/form-share-client.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { DocumentId, FormEntity, FormEntityItem } from "@nowcrm/services";
import { format } from "date-fns";
import {
	Check,
	ChevronLeft,
	ChevronRight,
	Keyboard,
	Loader2,
} from "lucide-react";
import { useMessages } from "next-intl";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { shareForm } from "@/app/[locale]/crm/forms/components/columns/shareForm";
import { DateTimePicker } from "@/components/dateTimePicker";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	getFormBySlugOrId,
	submitFormData,
} from "@/lib/actions/forms/get-form";
import { cn } from "@/lib/utils";
import CustomProgress from "../CustomProgress";
import ShareSocial from "./share-social";

// Import the useTheme hook at the top of the file with other imports
//import { useTheme } from "next-themes";

/**
 * FormShareClient component props
 */
interface FormShareClientProps {
	/** Form ID or slug to fetch */
	queryId: string;
	/** URL parameters passed to the form */
	urlParams: Record<string, string>;
}

/** Form display mode */
type FormMode = "step" | "list";

const RequiredMark: React.FC<{ required?: boolean }> = ({ required }) =>
	required ? (
		<span className="ml-1 text-destructive" aria-hidden="true">
			*
		</span>
	) : null;

/**
 * FormShareClient component
 *
 * A dynamic form component that supports both step-by-step (Typeform-like) and list modes
 * with swipe navigation, keyboard shortcuts, and responsive design.
 */
const FormShareClient: React.FC<FormShareClientProps> = ({
	queryId,
	urlParams,
}) => {
	const t = useMessages().Forms.Share;
	const formContainerRef = useRef<HTMLDivElement>(null);

	// ===== STATE MANAGEMENT =====
	// Form data and loading states
	const [loading, setLoading] = useState(true);
	const [formId, setFormId] = useState<DocumentId | undefined>(undefined);
	const [submitSuccess, setSubmitSuccess] = useState(false);
	const [submitDisabled, setSubmitDisabled] = useState(false);
	const [formData, setFormData] = useState<FormEntity>({} as FormEntity);
	const [fileUploads, setFileUploads] = useState<Record<string, File[]>>({});
	const [error, setError] = useState<string | null>(null);
	const [keyboardShortcutsVisible, setKeyboardShortcutsVisible] =
		useState(false);

	// Form mode state
	const [formMode, setFormMode] = useState<FormMode>("step");

	// Typeform-specific state (for step mode)
	const [currentStep, setCurrentStep] = useState(0);
	const [direction, setDirection] = useState<"forward" | "backward" | null>(
		null,
	);
	const [touchStart, setTouchStart] = useState<number | null>(null);
	const [isTransitioning, setIsTransitioning] = useState(false);

	const [shareUrl, setShareUrl] = useState<string | null>(null);

	const isEmbedded = urlParams?.isEmbedded === "1";

	function buildInitialDefaults(
		items: FormEntityItem[] = [],
		urlParams: Record<string, string> = {},
	) {
		const defaults: Record<string, any> = {};
		for (const item of items) {
			switch (item.type) {
				case "checkbox":
					defaults[item.name] = false;
					break;
				case "multi_checkbox":
				case "multi_choice":
					defaults[item.name] = [];
					break;
				case "single_choice":
				case "select":
				case "date":
					defaults[item.name] = undefined;
					break;
				case "attachment":
					defaults[item.name] = [];
					break;
				default:
					defaults[item.name] = "";
			}

			const paramValue = urlParams[item.name];
			if (paramValue !== undefined && paramValue !== null) {
				try {
					switch (item.type) {
						case "checkbox":
							defaults[item.name] = paramValue === "true" || paramValue === "1";
							break;
						case "multi_checkbox":
						case "multi_choice":
							defaults[item.name] = paramValue
								.split(",")
								.map((v) => v.trim())
								.filter(Boolean);
							break;
						case "date": {
							const d = new Date(paramValue);
							defaults[item.name] = Number.isNaN(d.getTime()) ? undefined : d;
							break;
						}
						default:
							defaults[item.name] = paramValue;
					}
				} catch {
					// ignore malformed URL values; keep safe defaults
				}
			}
		}

		// optional: capture unmapped params
		defaults.__extra = {};
		for (const [key, value] of Object.entries(urlParams)) {
			if (!items.some((i) => i.name === key)) {
				defaults.__extra[key] = value;
			}
		}
		return defaults;
	}

	// ===== FORM VALIDATION =====

	// Define value schema for form validation
	const formSchema = useMemo(() => {
		const shape: Record<string, z.ZodTypeAny> = {};
		const requiredMsg = (t as any).required ?? "This field is required";

		formData.form_items?.forEach((item) => {
			if (item.hidden) {
				shape[item.name] = z.any().optional();
				return;
			}
			switch (item.type) {
				case "email": {
					const email = z.string().email((t as any).valid_email as string);
					shape[item.name] = item.required
						? email
						: z.preprocess((v) => (v === "" ? undefined : v), email).optional();
					break;
				}

				case "number": {
					const numberSchema = z.preprocess(
						(v) => (v === "" || v === null ? undefined : v),
						z.coerce.number().refine((v) => Number.isFinite(v), {
							message: (t as any).valid_number as string,
						}),
					);
					shape[item.name] = item.required
						? numberSchema
						: numberSchema.optional();
					break;
				}

				case "checkbox": {
					shape[item.name] = item.required
						? z.literal(true, { errorMap: () => ({ message: requiredMsg }) })
						: z.boolean().optional();
					break;
				}

				case "multi_checkbox":
				case "multi_choice": {
					const arr = z.array(z.string());
					shape[item.name] = item.required
						? arr.min(1, requiredMsg)
						: arr.optional();
					break;
				}

				case "date": {
					const date = z.preprocess(
						(v) => {
							if (v === "" || v == null) return undefined;
							if (v instanceof Date) return v;
							const d = new Date(v as any);
							return Number.isNaN(d.getTime()) ? v : d;
						},
						z.date({
							required_error: requiredMsg,
							invalid_type_error: requiredMsg,
						}),
					);
					shape[item.name] = item.required ? date : date.optional();
					break;
				}

				case "single_choice":
				case "radio":
				case "select": {
					const str = z.string();
					shape[item.name] = item.required
						? str.min(1, requiredMsg)
						: str.optional();
					break;
				}

				case "attachment": {
					const files = z.any().refine(
						(val) => {
							if (val instanceof File) return true;
							if (Array.isArray(val) && val.every((f) => f instanceof File))
								return true;
							return false;
						},
						{ message: "Please upload a valid file." },
					);

					shape[item.name] = item.required
						? files.refine(
								(val) =>
									val instanceof File || (Array.isArray(val) && val.length > 0),
								{ message: requiredMsg },
							)
						: files.optional();

					break;
				}

				default: {
					const str = z.string();
					shape[item.name] = item.required
						? str.min(1, requiredMsg)
						: str.optional();
					break;
				}
			}
		});

		return z.object(shape);
	}, [formData.form_items, t]);

	type FormValues = z.infer<typeof formSchema>;

	// Initialize form with react-hook-form
	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {},
		mode: "onChange",
	});
	const { reset } = form;

	// ===== DATA FETCHING =====
	/**
	 * Fetch form data using the server action
	 */
	useEffect(() => {
		const fetchForm = async () => {
			setLoading(true);
			try {
				const response = await getFormBySlugOrId(queryId);
				if (!response.success) {
					setError(response.errorMessage ?? "Error fetching form");
					return;
				}

				const forms = response.data ?? [];
				if (forms.length === 0) {
					setError("Form not found");
					return;
				}

				const loadedForm = forms[0];
				setFormId(loadedForm.documentId);
				setFormData(loadedForm);
				setFormMode(loadedForm.form_view ? "list" : "step");

				const initialDefaults = buildInitialDefaults(
					loadedForm.form_items || [],
					urlParams,
				);
				reset(initialDefaults); // call RHF reset here

				const url = await shareForm(loadedForm.documentId, loadedForm.slug);
				setShareUrl(url);
			} catch (err) {
				console.error("Error fetching form:", err);
				setError("Failed to load form");
			} finally {
				setLoading(false);
			}
		};

		fetchForm();
	}, [queryId, reset, urlParams]);

	// ===== FORM RENDERING =====
	// Calculate progress percentage (only relevant for step mode)
	const visibleItems = useMemo(
		() => formData.form_items?.filter((item) => !item.hidden) ?? [],
		[formData.form_items],
	);

	const progress = visibleItems.length
		? (currentStep / visibleItems.length) * 100
		: 0;

	const isLastStep = currentStep === visibleItems.length - 1;
	const currentItem = visibleItems[currentStep];

	// ===== FORM NAVIGATION =====
	/**
	 * Navigate to the next step in the form
	 */
	const goToNextStep = useCallback(async () => {
		if (!visibleItems || currentStep >= visibleItems.length) return;

		const currentField = visibleItems[currentStep];

		const isValid = await form.trigger(currentField.name);
		if (!isValid) return;

		setDirection("forward");
		setIsTransitioning(true);
		setTimeout(() => {
			setCurrentStep((prev) => prev + 1);
			setIsTransitioning(false);
		}, 300);
	}, [currentStep, form, visibleItems]);

	/**
	 * Navigate to the previous step in the form
	 */
	const goToPrevStep = useCallback(() => {
		if (currentStep > 0) {
			setDirection("backward");
			setIsTransitioning(true);
			setTimeout(() => {
				setCurrentStep((prev) => prev - 1);
				setIsTransitioning(false);
			}, 300);
		}
	}, [currentStep]);
	// ===== KEYBOARD NAVIGATION =====
	/**
	 * Handle keyboard navigation for the form
	 */
	useEffect(() => {
		const handleKeyDown = (e: globalThis.KeyboardEvent) => {
			// Only handle keyboard navigation in step mode
			if (formMode !== "step") return;

			// Don't handle keyboard navigation if user is typing in an input
			if (
				document.activeElement instanceof HTMLInputElement ||
				document.activeElement instanceof HTMLTextAreaElement ||
				document.activeElement instanceof HTMLSelectElement
			) {
				// Allow Enter key to proceed to next step when in an input field
				if (e.key === "Enter" && !e.shiftKey) {
					e.preventDefault();
					goToNextStep();
				}
				return;
			}

			switch (e.key) {
				case "ArrowRight":
				case "Enter":
					e.preventDefault();
					goToNextStep();
					break;
				case "ArrowLeft":
					e.preventDefault();
					goToPrevStep();
					break;
				case "?":
					if (e.shiftKey) {
						e.preventDefault();
						setKeyboardShortcutsVisible(true);
					}
					break;
				case "Escape":
					if (keyboardShortcutsVisible) {
						e.preventDefault();
						setKeyboardShortcutsVisible(false);
					}
					break;
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [
		formMode,
		currentStep,
		formData.form_items?.length,
		goToNextStep,
		goToPrevStep,
		keyboardShortcutsVisible,
	]);

	// ===== TOUCH NAVIGATION =====
	/**
	 * Handle touch start event for swipe navigation
	 */
	const handleTouchStart = useCallback(
		(e: React.TouchEvent) => {
			if (formMode !== "step") return;
			setTouchStart(e.touches[0].clientX);
		},
		[formMode],
	);

	/**
	 * Handle touch move event for swipe navigation
	 */
	const handleTouchMove = useCallback(
		(e: React.TouchEvent) => {
			if (formMode !== "step" || touchStart === null) return;

			const touchEnd = e.touches[0].clientX;
			const diff = touchStart - touchEnd;

			// Threshold for swipe detection (50px)
			if (Math.abs(diff) > 50) {
				if (diff > 0) {
					// Swipe left - go to next step
					if (currentStep < (formData.form_items?.length || 0)) {
						goToNextStep();
					}
				} else {
					// Swipe right - go to previous step
					if (currentStep > 0) {
						goToPrevStep();
					}
				}
				setTouchStart(null);
			}
		},
		[
			formMode,
			touchStart,
			currentStep,
			formData.form_items?.length,
			goToNextStep,
			goToPrevStep,
		],
	);

	// ===== FILE HANDLING =====
	/**
	 * Handle file upload for attachment fields
	 */
	const handleFileUpload = useCallback(
		(fieldName: string, files: FileList | null) => {
			if (!files || files.length === 0) return;

			const fileArray = Array.from(files);
			setFileUploads((prev) => ({
				...prev,
				[fieldName]: fileArray,
			}));

			// Here you would typically upload the file to your server
			// and get back a URL or ID to submit with the form
			setSubmitDisabled(true);

			// Mock upload process
			setTimeout(() => {
				setSubmitDisabled(false);
			}, 1000);
		},
		[],
	);

	// ===== FORM SUBMISSION =====
	/**
	 * Find identifier field (usually email) for form submission
	 */
	const findIdentifier = useCallback((): string => {
		if (!formData.form_items) return "";

		const formIdentifier = formData.form_items.find(
			(item) => item.type === "email",
		);
		if (formIdentifier) {
			return form.getValues(formIdentifier.name) || "";
		} else {
			return urlParams.contact || urlParams.email || "";
		}
	}, [form, formData.form_items, urlParams.contact, urlParams.email]);

	/**
	 * Parse form data for submission
	 */
	const parseFormData = useCallback((formValues: any) => {
		const parsedData: Record<string, any> = {};

		for (const [key, value] of Object.entries(formValues)) {
			if (
				value instanceof File ||
				(Array.isArray(value) && value[0] instanceof File)
			) {
				// ✅ Leave File or File[] untouched
				parsedData[key] = value;
			} else if (value instanceof Date) {
				parsedData[key] = format(value, "dd/MM/yyyy");
			} else if (Array.isArray(value)) {
				parsedData[key] = value.join(", ");
			} else {
				parsedData[key] = value;
			}
		}

		return parsedData;
	}, []);

	/**
	 * Handle form submission
	 */
	const onSubmit = async (values: FormValues) => {
		setLoading(true);

		try {
			const formSubmitData = {
				formId,
				identifier: findIdentifier(),
				formData: parseFormData(values), // ✅ File[] is now preserved
			};

			console.log("Submitting data");
			console.log(formSubmitData);

			const response = await submitFormData(formSubmitData);

			if (!response.success) {
				console.log(response)
				setError(response.message || "Form submission failed");
				return;
			}

			setSubmitSuccess(true);
		} catch (error) {
			console.error("Submit error:", error);
			setError("Failed to submit form");
		} finally {
			setLoading(false);
		}
	};

	// ===== FORM FIELD RENDERING =====
	/**
	 * Render form field based on type
	 */
	const renderFormField = useCallback(
		(item: FormEntityItem, isStepMode = true) => {
			switch (item.type) {
				case "email":
					return (
						<FormField
							key={item.id}
							control={form.control}
							name={item.name}
							render={({ field }) => (
								<FormItem className="w-full">
									{!isStepMode && (
										<FormLabel>
											{item.label}
											<RequiredMark required={item.required} />
										</FormLabel>
									)}{" "}
									<FormControl>
										<Input
											placeholder="hans.peter@example.ch"
											{...field}
											className={cn(
												isStepMode ? "h-auto p-6 text-lg" : "text-base",
												formData.brand_color &&
													isValidHexColor(formData.brand_color)
													? "border border-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)]"
													: "",
											)}
											autoFocus={isStepMode}
											onKeyDown={(e) => {
												if (e.key === "Enter" && isStepMode) {
													e.preventDefault();
													goToNextStep();
												}
											}}
											value={field.value ?? ""}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					);

				case "number":
					return (
						<FormField
							key={item.id}
							control={form.control}
							name={item.name}
							render={({ field }) => (
								<FormItem className="w-full">
									{!isStepMode && (
										<FormLabel>
											{item.label}
											<RequiredMark required={item.required} />
										</FormLabel>
									)}{" "}
									<FormControl>
										<Input
											type="number"
											placeholder="Insert a number"
											{...field}
											value={field.value ?? ""}
											className={cn(
												isStepMode ? "h-auto p-6 text-lg" : "text-base",
												formData.brand_color &&
													isValidHexColor(formData.brand_color)
													? "border border-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)]"
													: "",
											)}
											autoFocus={isStepMode}
											onKeyDown={(e) => {
												if (e.key === "Enter" && isStepMode) {
													e.preventDefault();
													goToNextStep();
												}
											}}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					);

				case "text_area":
					return (
						<FormField
							key={item.id}
							control={form.control}
							name={item.name}
							render={({ field }) => (
								<FormItem className="w-full">
									{!isStepMode && (
										<FormLabel>
											{item.label}
											<RequiredMark required={item.required} />
										</FormLabel>
									)}{" "}
									<FormControl>
										<Textarea
											placeholder="Type your message here"
											{...field}
											value={field.value ?? ""}
											className={cn(
												isStepMode
													? "min-h-[150px] p-6 text-lg"
													: "min-h-[100px] text-base",
												"border border-input",
												formData.brand_color &&
													isValidHexColor(formData.brand_color)
													? "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)]"
													: "",
											)}
											autoFocus={isStepMode}
											onKeyDown={(e) => {
												if (e.key === "Enter" && e.ctrlKey && isStepMode) {
													e.preventDefault();
													goToNextStep();
												}
											}}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					);

				case "checkbox":
					return (
						<FormField
							key={item.id}
							control={form.control}
							name={item.name}
							render={({ field }) => (
								<FormItem
									className={cn(
										"flex flex-row items-start space-x-3 space-y-0 rounded-md p-4",
										isStepMode ? "border" : "",
									)}
								>
									<FormControl>
										<Checkbox
											checked={!!field.value}
											onCheckedChange={(checked) =>
												field.onChange(Boolean(checked))
											}
											className={cn(
												"border border-input",
												isStepMode ? "h-6 w-6" : "h-4 w-4",
												formData.brand_color &&
													isValidHexColor(formData.brand_color)
													? "focus-visible:ring-[var(--brand-color)] data-[state=checked]:border-[var(--brand-color)] data-[state=checked]:bg-[var(--brand-color)]"
													: "",
											)}
											onKeyDown={(e) => {
												if (e.key === "Enter" && isStepMode) {
													e.preventDefault();
													goToNextStep();
												}
											}}
										/>
									</FormControl>
									<div className="space-y-1 leading-none">
										<div className="flex items-center gap-1">
											<FormLabel
												className={cn(
													"font-normal",
													isStepMode ? "text-lg" : "text-base",
												)}
											>
												<span
													dangerouslySetInnerHTML={{ __html: item.label }}
												/>
											</FormLabel>
											<RequiredMark required={item.required} />
										</div>
									</div>
								</FormItem>
							)}
						/>
					);

				case "multi_checkbox":
					return (
						<FormField
							key={item.id}
							control={form.control}
							name={item.name}
							render={() => (
								<FormItem className="w-full">
									{!isStepMode && (
										<FormLabel>
											{item.label}
											<RequiredMark required={item.required} />
										</FormLabel>
									)}{" "}
									<div className="space-y-3">
										{item.options?.map((option: any) => (
											<FormField
												key={option}
												control={form.control}
												name={item.name}
												render={({ field }) => {
													return (
														<FormItem
															key={option}
															className={cn(
																"flex items-center space-x-3 space-y-0",
																isStepMode ? "rounded-md border p-4" : "p-2",
															)}
														>
															<FormControl>
																<Checkbox
																	checked={field.value?.includes(option)}
																	onCheckedChange={(checked) => {
																		return checked
																			? field.onChange([
																					...(field.value || []),
																					option,
																				])
																			: field.onChange(
																					field.value?.filter(
																						(value: any) => value !== option,
																					),
																				);
																	}}
																	className={cn(
																		isStepMode ? "h-6 w-6" : "h-4 w-4",
																		"border border-input",
																		formData.brand_color &&
																			isValidHexColor(formData.brand_color)
																			? [
																					"focus-visible:ring-2 focus-visible:ring-[var(--brand-color)]",
																					"data-[state=checked]:bg-[var(--brand-color)]",
																					"data-[state=checked]:border-[var(--brand-color)]",
																				].join(" ")
																			: "",
																	)}
																	onKeyDown={(e) => {
																		if (e.key === "Enter" && isStepMode) {
																			e.preventDefault();
																			goToNextStep();
																		}
																	}}
																/>
															</FormControl>
															<FormLabel
																className={cn(
																	"font-normal",
																	isStepMode ? "text-lg" : "text-base",
																)}
															>
																{option}
															</FormLabel>
														</FormItem>
													);
												}}
											/>
										))}
									</div>
									<FormMessage />
								</FormItem>
							)}
						/>
					);

				case "date":
					return (
						<FormField
							key={item.id}
							control={form.control}
							name={item.name}
							render={({ field }) => (
								<FormItem className="w-full">
									{!isStepMode && (
										<FormLabel>
											{item.label}
											<RequiredMark required={item.required} />
										</FormLabel>
									)}{" "}
									<FormControl>
										<DateTimePicker
											value={field.value}
											onChange={(date) => {
												field.onChange(date);
												if (isStepMode) {
													// Auto-advance after selection
													setTimeout(() => goToNextStep(), 500);
												}
											}}
											granularity="day"
											hourCycle={24} // or 12 for AM/PM
											className={cn(
												isStepMode ? "p-6 text-lg" : "text-base",
												"border border-input",
												formData.brand_color &&
													isValidHexColor(formData.brand_color)
													? [
															"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)]",
															"data-[state=open]:ring-[var(--brand-color)]",
														].join(" ")
													: "",
											)}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					);

				case "select":
					return (
						<FormField
							key={item.id}
							control={form.control}
							name={item.name}
							render={({ field }) => (
								<FormItem className="w-full">
									{!isStepMode && (
										<FormLabel>
											{item.label}
											<RequiredMark required={item.required} />
										</FormLabel>
									)}{" "}
									<Select
										value={field.value ?? undefined}
										onValueChange={(value) => {
											field.onChange(value);
											if (isStepMode) {
												setTimeout(() => goToNextStep(), 500);
											}
										}}
									>
										<FormControl>
											<SelectTrigger
												className={cn(
													isStepMode ? "h-auto p-6 text-lg" : "text-base",
													"border border-input",
													formData.brand_color &&
														isValidHexColor(formData.brand_color)
														? [
																"focus-visible:ring-2 focus-visible:ring-[var(--brand-color)]",
																"data-[state=open]:ring-2 data-[state=open]:ring-[var(--brand-color)]",
															].join(" ")
														: "",
												)}
											>
												<SelectValue placeholder="Select an option" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											{item.options?.map((option: any) => (
												<SelectItem
													key={option}
													value={option}
													className={cn(
														isStepMode ? "text-lg" : "text-base",
														formData.brand_color &&
															isValidHexColor(formData.brand_color)
															? "focus:bg-[--selected-bg] focus:text-[--selected-fg] data-[state=checked]:bg-[--selected-bg] data-[state=checked]:text-[--selected-fg]"
															: "",
													)}
												>
													{option}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>
					);

				case "multi_choice":
					// For multi-select, we'll use a custom implementation with checkboxes
					return (
						<FormField
							key={item.id}
							control={form.control}
							name={item.name}
							render={() => (
								<FormItem className="w-full">
									{!isStepMode && (
										<FormLabel>
											{item.label}
											<RequiredMark required={item.required} />
										</FormLabel>
									)}{" "}
									<div className="space-y-3">
										{item.options?.map((option: any) => (
											<FormField
												key={option}
												control={form.control}
												name={item.name}
												render={({ field: innerField }) => {
													return (
														<FormItem
															key={option}
															className={cn(
																"flex items-center space-x-3 space-y-0",
																isStepMode ? "rounded-md border p-4" : "p-2",
															)}
														>
															<FormControl>
																<Checkbox
																	checked={innerField.value?.includes(option)}
																	onCheckedChange={(checked) => {
																		return checked
																			? innerField.onChange([
																					...(innerField.value || []),
																					option,
																				])
																			: innerField.onChange(
																					innerField.value?.filter(
																						(v: any) => v !== option,
																					),
																				);
																	}}
																	className={cn(
																		isStepMode ? "h-6 w-6" : "h-4 w-4",
																		"border border-input",
																		formData.brand_color &&
																			isValidHexColor(formData.brand_color)
																			? [
																					"focus-visible:ring-2 focus-visible:ring-[var(--brand-color)]",
																					"data-[state=checked]:bg-[var(--brand-color)]",
																					"data-[state=checked]:border-[var(--brand-color)]",
																				].join(" ")
																			: "",
																	)}
																	onKeyDown={(e) => {
																		if (e.key === "Enter" && isStepMode) {
																			e.preventDefault();
																			goToNextStep();
																		}
																	}}
																/>
															</FormControl>
															<FormLabel
																className={cn(
																	"font-normal",
																	isStepMode ? "text-lg" : "text-base",
																)}
															>
																{option}
															</FormLabel>
														</FormItem>
													);
												}}
											/>
										))}
									</div>
									<FormMessage />
								</FormItem>
							)}
						/>
					);

				case "single_choice": // or "radio"
					return (
						<FormField
							key={item.id}
							control={form.control}
							name={item.name}
							render={({ field }) => (
								<FormItem className="w-full">
									{!isStepMode && (
										<FormLabel>
											{item.label}
											<RequiredMark required={item.required} />
										</FormLabel>
									)}{" "}
									<FormControl>
										<RadioGroup
											value={field.value ?? undefined}
											onValueChange={(val) => {
												field.onChange(val);
												if (isStepMode) setTimeout(() => goToNextStep(), 200);
											}}
											className={cn(isStepMode ? "space-y-3" : "space-y-2")}
										>
											{item.options?.map((option: any) => (
												<div
													key={option}
													className="flex items-center space-x-3"
												>
													<RadioGroupItem
														id={`${item.name}-${option}`}
														value={option}
													/>
													<FormLabel
														htmlFor={`${item.name}-${option}`}
														className={cn(
															isStepMode ? "text-lg" : "text-base",
															"font-normal",
														)}
													>
														{option}
													</FormLabel>
												</div>
											))}
										</RadioGroup>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					);

				case "attachment":
					return (
						<FormField
							key={item.id}
							control={form.control}
							name={item.name}
							render={({ field }) => (
								<FormItem className="w-full space-y-2">
									{!isStepMode && (
										<FormLabel>
											{item.label}
											<RequiredMark required={item.required} />
										</FormLabel>
									)}{" "}
									<p className="text-muted-foreground text-sm">
										Max file size: 100MB per file
									</p>
									<Input
										type="file"
										onChange={(e) => {
											const files = e.target.files;
											if (!files || files.length === 0) return;
											field.onChange(Array.from(files)); // ✅ store as File[]
										}}
										multiple
									/>
									{field.value?.length > 0 && (
										<ul className="mt-2 text-muted-foreground text-sm">
											{field.value.map((file: File, idx: number) => (
												<li key={idx}>{file.name}</li>
											))}
										</ul>
									)}
									<FormMessage />
								</FormItem>
							)}
						/>
					);

				default: // text
					return (
						<FormField
							key={item.id}
							control={form.control}
							name={item.name}
							render={({ field }) => (
								<FormItem className="w-full">
									{!isStepMode && (
										<FormLabel>
											{item.label}
											<RequiredMark required={item.required} />
										</FormLabel>
									)}{" "}
									<FormControl>
										<Input
											{...field}
											className={cn(
												isStepMode ? "h-auto p-6 text-lg" : "text-base",
												"border border-input",
												formData.brand_color &&
													isValidHexColor(formData.brand_color)
													? "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)]"
													: "",
											)}
											value={field.value ?? ""}
											autoFocus={isStepMode}
											onKeyDown={(e) => {
												if (e.key === "Enter" && isStepMode) {
													e.preventDefault();
													goToNextStep();
												}
											}}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					);
			}
		},
		[form.control, fileUploads, goToNextStep, handleFileUpload],
	);

	// ===== BACKGROUND COVER IMAGE =====
	/**
	 * Get background style with cover image if available
	 */
	// Update the getBackgroundStyle function to use theme-aware gradients
	//const { theme } = useTheme();
	const getBackgroundStyle = useCallback(() => {
		if (formData.cover?.url) {
			return {
				backgroundImage: `url(${formData.cover.url})`,
				backgroundSize: "cover",
				backgroundPosition: "center",
				backgroundAttachment: "fixed",
				backgroundRepeat: "no-repeat",
			};
		}
		return {};
	}, [formData.cover?.url]);

	/**
	 * Check if a string is a valid hex color
	 */
	const isValidHexColor = useCallback((color?: string): boolean => {
		if (!color) return false;
		// Check if it's a valid hex color (3 or 6 digits with optional #)
		const hexRegex = /^#?([0-9A-F]{3}){1,2}$/i;
		return hexRegex.test(color);
	}, []);

	/**
	 * Get custom CSS variables for brand colors
	 */
	const getBrandColorStyles = useCallback(() => {
		if (formData.brand_color && isValidHexColor(formData.brand_color)) {
			// Ensure the color has a # prefix
			const color = formData.brand_color.startsWith("#")
				? formData.brand_color
				: `#${formData.brand_color}`;

			return {
				"--brand-color": color,
				"--brand-color-hover": `${color}dd`, // Add some transparency for hover state
			} as React.CSSProperties;
		}
		return {};
	}, [formData.brand_color, isValidHexColor]);

	// ===== LOADING AND ERROR STATES =====
	if (loading && !formId) {
		return (
			<div className="flex min-h-[200px] items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (error) {
		return (
			<Alert variant="destructive" className="mx-auto max-w-md">
				<AlertTitle>Error</AlertTitle>
				<AlertDescription>{error}</AlertDescription>
			</Alert>
		);
	}

	if (!formData.active && !loading) {
		return (
			<Alert variant="destructive" className="mx-auto max-w-md">
				<AlertTitle>Form Inactive</AlertTitle>
				<AlertDescription>This form is not currently active.</AlertDescription>
			</Alert>
		);
	}

	// ===== SUCCESS STATE =====
	if (submitSuccess && !loading) {
		return (
			<>
				<Card className="mx-auto max-w-md">
					<CardHeader>
						<CardTitle className="text-center text-green-600">
							Success!
						</CardTitle>
					</CardHeader>

					<CardContent>
						<div className="flex flex-col items-center gap-4">
							<div className="rounded-full bg-green-100 p-3">
								<Check className="h-8 w-8 text-green-600" />
							</div>
							{formData?.submission_success_text ? (
								<div
									className="space-y-2 text-center font-medium text-lg text-muted-foreground"
									dangerouslySetInnerHTML={{
										__html: formData?.submission_success_text,
									}}
								/>
							) : (
								<div className="space-y-2 text-center text-muted-foreground">
									<p className="font-medium text-lg">
										Ihre Eingaben wurden erfolgreich übermittelt.
										<br />
										Wir danken Ihnen herzlich für Ihre Zeit und Ihren Einsatz
										beim Ausfüllen dieses Formulars.
									</p>
									<p className="font-medium text-lg">
										Your submission was successful.
										<br />
										We appreciate your time and effort in completing this form.
									</p>
									<p className="font-medium text-lg">
										Votre envoi a été effectué avec succès.
										<br />
										Nous vous remercions sincèrement pour le temps et les
										efforts consacrés à remplir ce formulaire.
									</p>
									<p className="font-medium text-lg">
										L’invio è avvenuto con successo.
										<br />
										La ringraziamo sinceramente per il tempo e l’impegno
										dedicati alla compilazione di questo modulo.
									</p>
								</div>
							)}
						</div>
					</CardContent>
					<CardFooter className="flex flex-col gap-4">
						<Button
							className={cn(
								"w-full",
								formData.brand_color && isValidHexColor(formData.brand_color)
									? "bg-[var(--brand-color)] hover:bg-[var(--brand-color-hover)]"
									: "",
							)}
							onClick={() => window.location.reload()}
						>
							Fill in Again?
						</Button>
					</CardFooter>
				</Card>
				<ShareSocial
					title={formData.name}
					url={shareUrl || ""}
					hashtag="#survey"
				/>
			</>
		);
	}

	return (
		<div
			className="relative flex min-h-[80vh] flex-col"
			onTouchStart={handleTouchStart}
			onTouchMove={handleTouchMove}
			ref={formContainerRef}
			style={{
				...getBackgroundStyle(),
				...getBrandColorStyles(),
			}}
		>
			{/* Logo (if available) */}
			{formData.logo?.url && (
				<div className="absolute top-4 left-4 z-10">
					<img
						src={formData.logo.url || "/placeholder.svg"}
						alt={`${formData.name || "Form"} logo`}
						className="h-10 w-auto object-contain"
					/>
				</div>
			)}

			<div className="absolute top-4 right-4 z-10 flex items-center gap-2">
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							{formMode === "step" && (
								<Button
									variant="ghost"
									size="icon"
									onClick={() => setKeyboardShortcutsVisible(true)}
								>
									<Keyboard className="h-4 w-4" />
									<span className="sr-only">Keyboard shortcuts</span>
								</Button>
							)}
						</TooltipTrigger>
						<TooltipContent>
							<p>Keyboard shortcuts</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</div>

			{/* Keyboard shortcuts dialog using shadcn/ui Dialog */}
			{formMode === "step" && (
				<Dialog
					open={keyboardShortcutsVisible}
					onOpenChange={setKeyboardShortcutsVisible}
				>
					<DialogContent className="sm:max-w-md">
						<DialogHeader>
							<DialogTitle>Keyboard Shortcuts</DialogTitle>
						</DialogHeader>
						<div className="space-y-4 py-2">
							<div className="grid grid-cols-2 gap-4">
								<div className="text-sm">Next question</div>
								<div className="rounded-md bg-muted px-2 py-1 text-right font-mono text-sm">
									→ or Enter
								</div>

								<div className="text-sm">Previous question</div>
								<div className="rounded-md bg-muted px-2 py-1 text-right font-mono text-sm">
									←
								</div>

								<div className="text-sm">
									{formData.submit_text || "Submit"}
								</div>
								<div className="rounded-md bg-muted px-2 py-1 text-right font-mono text-sm">
									Enter (on last step)
								</div>

								<div className="text-sm">Show keyboard shortcuts</div>
								<div className="rounded-md bg-muted px-2 py-1 text-right font-mono text-sm">
									Shift + ?
								</div>
							</div>
						</div>
						<DialogFooter>
							<Button onClick={() => setKeyboardShortcutsVisible(false)}>
								Close
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			)}

			{/* Progress bar (only for step mode) */}
			{formMode === "step" && (
				<div className="sticky top-0 right-0 left-0 z-40">
					<div className="space-y-2">
						<CustomProgress
							value={progress}
							brandColor={formData.brand_color}
							variant="brand"
						/>
					</div>
				</div>
			)}

			<Form {...form}>
				<form
					onSubmit={form.handleSubmit(onSubmit)}
					className="flex flex-1 flex-col"
				>
					{/* Step-by-step mode */}
					{formMode === "step" ? (
						<div
							className={cn(
								"flex flex-1 flex-col items-center justify-center",
								!isEmbedded ? "px-4 pt-24 pb-16 md:pt-32" : "",
							)}
						>
							{/* Form header */}
							{!isEmbedded && currentStep === 0 && (
								<div
									className={`mb-8 text-center transition-all duration-300 ${
										isTransitioning
											? direction === "forward"
												? "translate-x-full opacity-0"
												: "-translate-x-full opacity-0"
											: "translate-x-0 opacity-100"
									}`}
								>
									<h2 className="mb-4 font-bold text-3xl">{formData.name}</h2>
									{formData.description && (
										<div
											// className="text-muted-foreground"
											dangerouslySetInnerHTML={{ __html: formData.description }}
										/>
									)}
								</div>
							)}

							{/* Current question */}
							{currentItem && (
								<div
									className={`w-full max-w-xl transition-all duration-300 ${
										isTransitioning
											? direction === "forward"
												? "translate-x-full opacity-0"
												: "-translate-x-full opacity-0"
											: "translate-x-0 opacity-100"
									}`}
								>
									<h3 className="mb-6 font-medium text-2xl">
										{currentItem.label}{" "}
										<RequiredMark required={currentItem.required} />
									</h3>
									{renderFormField(currentItem, true)}
								</div>
							)}

							{/* Final submit screen */}
							{currentStep === visibleItems.length && (
								<div
									className={`w-full max-w-xl text-center transition-all duration-300 ${
										isTransitioning
											? direction === "forward"
												? "translate-x-full opacity-0"
												: "-translate-x-full opacity-0"
											: "translate-x-0 opacity-100"
									}`}
								>
									<h3 className="mb-6 font-medium text-2xl">
										Ready to submit?
									</h3>
									<p className="mb-8 text-muted-foreground">
										Thank you for completing the form. Click the button below to
										submit your responses.
									</p>

									{/* Add a summary of responses */}
									<div className="mb-8 rounded-md border bg-background/80 p-6 text-left">
										<h4 className="mb-4 font-medium text-lg">
											Your responses:
										</h4>
										<div className="space-y-4">
											{visibleItems.map((item) => {
												const value = form.getValues(item.name);
												if (!value && value !== false) return null;

												return (
													<div key={item.id} className="grid grid-cols-2 gap-2">
														<div className="font-medium">{item.label}:</div>
														<div className="text-muted-foreground">
															{Array.isArray(value)
																? value.join(", ")
																: value instanceof Date
																	? format(value, "dd/MM/yyyy")
																	: typeof value === "boolean"
																		? value
																			? "Yes"
																			: "No"
																		: value}
														</div>
													</div>
												);
											})}
										</div>
									</div>

									<Button
										type="submit"
										disabled={submitDisabled || loading}
										className={cn(
											"w-full py-6 text-lg",
											formData.brand_color &&
												isValidHexColor(formData.brand_color)
												? "bg-[var(--brand-color)] hover:bg-[var(--brand-color-hover)]"
												: "",
										)}
										size="lg"
									>
										{loading ? (
											<Loader2 className="mr-2 h-5 w-5 animate-spin" />
										) : (
											<Check className="mr-2 h-5 w-5" />
										)}
										{formData.submit_text || "Submit"}
									</Button>
								</div>
							)}
						</div>
					) : (
						/* List mode */
						<div
							className={cn(
								"mx-auto w-full max-w-3xl flex-1",
								isEmbedded ? "p-0" : "p-4 pt-12 md:p-8",
							)}
						>
							{/* Form header */}
							{!isEmbedded && (
								<div className="mb-8">
									<h2 className="mb-4 font-bold text-2xl">{formData.name}</h2>
									{formData.description && (
										<div
											className="text-muted-foreground"
											dangerouslySetInnerHTML={{ __html: formData.description }}
										/>
									)}
								</div>
							)}

							{/* All questions in a list */}
							<div className="space-y-3">
								{formData.form_items
									?.filter((item) => !item.hidden)
									.map((item) => (
										<div
											key={item.id}
											className="rounded-md border bg-background/80 p-2"
										>
											{renderFormField(item, false)}
										</div>
									))}
							</div>

							{/* Submit button */}
							<div className="mt-3">
								<Button
									type="submit"
									disabled={submitDisabled || loading}
									className={cn(
										"w-full py-6 text-lg",
										formData.brand_color &&
											isValidHexColor(formData.brand_color)
											? "bg-[var(--brand-color)] hover:bg-[var(--brand-color-hover)]"
											: "",
									)}
								>
									{loading ? (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									) : null}
									{formData.submit_text || "Submit"}
								</Button>
							</div>
						</div>
					)}

					{/* Navigation buttons (only for step mode) */}
					{formMode === "step" && (
						<div className="flex justify-between p-4">
							<Button
								type="button"
								variant="ghost"
								onClick={goToPrevStep}
								disabled={currentStep === 0}
								className={currentStep === 0 ? "opacity-0" : "opacity-100"}
							>
								<ChevronLeft className="mr-2 h-5 w-5" />
								Back
							</Button>

							{currentStep < visibleItems.length ? (
								<Button
									type="button"
									onClick={goToNextStep}
									className={cn(
										"ml-auto",
										formData.brand_color &&
											isValidHexColor(formData.brand_color)
											? "bg-[var(--brand-color)] hover:bg-[var(--brand-color-hover)]"
											: "",
									)}
								>
									{isLastStep ? "Review" : "Next"}
									<ChevronRight className="ml-2 h-5 w-5" />
								</Button>
							) : (
								<Button
									type="submit"
									disabled={submitDisabled || loading}
									className={cn(
										"ml-auto",
										formData.brand_color &&
											isValidHexColor(formData.brand_color)
											? "bg-[var(--brand-color)] hover:bg-[var(--brand-color-hover)]"
											: "",
									)}
								>
									{loading ? (
										<Loader2 className="mr-2 h-5 w-5 animate-spin" />
									) : (
										<Check className="mr-2 h-5 w-5" />
									)}
									{formData.submit_text || "Submit"}
								</Button>
							)}
						</div>
					)}
				</form>
			</Form>
		</div>
	);
};

export default FormShareClient;
