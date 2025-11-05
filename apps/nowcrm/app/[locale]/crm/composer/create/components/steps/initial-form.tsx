"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Edit, HelpCircle, ListPlus, Loader2 } from "lucide-react";
import { useMessages } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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
import { getEmailChannel } from "@/lib/actions/channels/get-email-channel";
import { compositionModels } from "@/lib/static/compoisitonModels";
import { getLanguageLabel, getLanguageValue } from "@/lib/static/languages";
import type { ReferenceComposition } from "@/lib/types/new_type/composition";

interface InitialFormProps {
	onSubmit: (data: ReferenceComposition) => void;
	channels: { value: string; label: string }[];
	initialData?: ReferenceComposition | null;
	onCreateFromScratch: () => void;
}

// Function to extract values from prompt text
const extractValue = (text: string, field: string) => {
	const regex = new RegExp(`${field}:\\s*\\[(.*?)\\]`, "i");
	const match = text.match(regex);
	if (field === "Language") {
		return getLanguageValue(match ? match[1].trim() : undefined);
	}
	return match ? match[1].trim() : null;
};

// Sample categories - replace with your actual categories
const categories = [
	{ id: "marketing", name: "Marketing" },
	{ id: "sales", name: "Sales" },
	{ id: "support", name: "Customer Support" },
	{ id: "technical", name: "Technical" },
	{ id: "educational", name: "Educational" },
	{ id: "social", name: "Social Media" },
];

// Sample prompt bases - replace with your actual prompt bases
// In a real implementation, you might want to filter these based on the selected category
const promptBases = {
	marketing: [
		{ id: "email-campaign", name: "Email Campaign" },
		{ id: "product-launch", name: "Product Launch" },
		{ id: "promotional", name: "Promotional Content" },
	],
	sales: [
		{ id: "cold-outreach", name: "Cold Outreach" },
		{ id: "follow-up", name: "Follow-up Email" },
		{ id: "proposal", name: "Sales Proposal" },
	],
	support: [
		{ id: "ticket-response", name: "Ticket Response" },
		{ id: "troubleshooting", name: "Troubleshooting Guide" },
		{ id: "faq", name: "FAQ Response" },
	],
	technical: [
		{ id: "documentation", name: "Technical Documentation" },
		{ id: "release-notes", name: "Release Notes" },
		{ id: "api-guide", name: "API Guide" },
	],
	educational: [
		{ id: "lesson-plan", name: "Lesson Plan" },
		{ id: "tutorial", name: "Tutorial" },
		{ id: "explainer", name: "Concept Explainer" },
	],
	social: [
		{ id: "post", name: "Social Media Post" },
		{ id: "campaign", name: "Social Campaign" },
		{ id: "response", name: "Community Response" },
	],
};

const formSchema = z.object({
	title: z.string().min(5, {
		message: "Composition title should be at least 5 symbols",
	}),
	subject: z.string().min(5, {
		message: "Composition subject should be at least 5 symbols",
	}),
	model: z.enum(["gpt-4o-mini", "claude"]),
	prompt: z.string(),
	// Hidden fields that will be set automatically
	category: z.string(),
	promptBase: z.string(),
	language: z.enum(["en", "it", "fr", "de"]).default("en"),
	mainChannel: z.coerce.number(),
	persona: z.string().optional(),
});

// Step types for the form flow
type FormStep = "category" | "promptBase" | "details";

export default function InitialForm({
	onSubmit,
	initialData,
	onCreateFromScratch,
}: InitialFormProps) {
	const t = useMessages();

	const [isCreatingFromScratch, setIsCreatingFromScratch] = useState(false);
	// Also initialize these states based on initialData
	const [selectedCategory, setSelectedCategory] = useState<string | null>(
		initialData?.category || null,
	);
	const [selectedPromptBase, setSelectedPromptBase] = useState<string | null>(
		// This is a placeholder - in a real app you might extract this from the prompt or store it separately
		initialData?.category || null,
	);

	console.log("initialData", initialData);
	const [currentStep, setCurrentStep] = useState<FormStep>(() => {
		// If we have initial data, go directly to the details step
		if (initialData?.category && initialData?.prompt) {
			// Set the selected category and prompt base from initialData
			setSelectedCategory(initialData.category);
			setSelectedPromptBase(initialData.category); // This is a placeholder, ideally you'd determine the actual promptBase
			return "details";
		}
		return "category";
	});

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: initialData
			? {
					title: initialData.title || "",
					subject: initialData.subject || "",
					language: initialData.language || "en",
					mainChannel: initialData.mainChannel || undefined,
					category: initialData.category || "",
					persona: initialData.persona || "",
					promptBase: initialData.promptBase || "",
					model: initialData.model || "gpt-4o-mini",
					prompt: initialData.prompt || "",
				}
			: {
					title: "",
					subject: "",
					language: "en",
					mainChannel: undefined,
					category: "",
					persona: "",
					model: "gpt-4o-mini",
					prompt: "",
				},
	});

	// Generate the base prompt text when a prompt base is selected
	const generateBasePrompt = (category: string, promptBase: string) => {
		// Get current values from the form
		const language = form.getValues().language || "en";
		const persona = form.getValues().persona || "Professional";

		return `Take a deep breath and work on this problem step-by-step:
Based on the user's request, generate a text with the following attributes:

Category/Topic: [${category}]

Language: [${getLanguageLabel(language)}]

Persona: [${persona}]

User Task: ${promptBase}

The output should reflect the tone, vocabulary, and perspective typical for the chosen persona. Keep the content aligned with the task, and relevant to the selected category. The output should contain only content without other text.
`;
	};

	// Handle category selection
	const handleCategorySelect = (categoryId: string) => {
		setSelectedCategory(categoryId);
		form.setValue("category", categoryId);
		setCurrentStep("promptBase");
	};

	// Handle prompt base selection
	const handlePromptBaseSelect = async (
		promptBaseId: string,
		promptBaseName: string,
	) => {
		setSelectedPromptBase(promptBaseId);
		form.setValue("promptBase", promptBaseId);

		// Set the title to the prompt base name
		form.setValue("title", promptBaseName);

		//Set subject to the prompt base name
		form.setValue("subject", promptBaseName);

		// Set mainChannel to 1
		const id = await getEmailChannel();
		if (id.data) form.setValue("mainChannel", id.data[0].id);
		else form.setValue("mainChannel", 1);

		// Generate and set the base prompt text
		const basePrompt = generateBasePrompt(
			categories.find((c) => c.id === selectedCategory)?.name || "",
			promptBaseName,
		);
		form.setValue("prompt", basePrompt);

		setCurrentStep("details");
	};

	// Go back to previous step
	const handleBack = () => {
		if (currentStep === "promptBase") {
			setCurrentStep("category");
		} else if (currentStep === "details") {
			setCurrentStep("promptBase");
		}
	};

	// Update the form submission handler to ensure it works when going back from other steps
	async function handleSubmit(values: z.infer<typeof formSchema>) {
		try {
			// Extract values from the prompt text
			const promptText = values.prompt;
			const extractedLanguage = extractValue(promptText, "Language") || "en";
			const extractedPersona =
				extractValue(promptText, "Persona") || "Professional";
			const extractedCategory =
				extractValue(promptText, "Category/Topic") || selectedCategory;
			// Update the form values with extracted data
			const updatedValues = {
				...values,
				language: extractedLanguage.toLowerCase() as "en" | "it" | "fr" | "de",
				persona: extractedPersona,
				category: extractedCategory || "",
			};

			console.log(updatedValues);
			// Call the onSubmit handler with the updated values
			await onSubmit(updatedValues);
		} catch (error) {
			console.error("Error submitting form:", error);
		}
	}

	async function handleCreateFromScratch() {
		setIsCreatingFromScratch(true);
		try {
			await onCreateFromScratch();
		} finally {
			setIsCreatingFromScratch(false);
		}
	}

	return (
		<div>
			<div className="mb-6 flex items-center justify-between">
				<h2 className="font-bold text-2xl">
					{t.Composer.initialForm.step1Title}
				</h2>
				<Button
					variant="outline"
					onClick={handleCreateFromScratch}
					className="flex items-center gap-2"
					disabled={isCreatingFromScratch}
				>
					{isCreatingFromScratch ? (
						<>
							<Loader2 className="h-4 w-4 animate-spin" />
							{t.Composer.initialForm.creating}
						</>
					) : (
						<>
							<Edit className="h-4 w-4" />
							{t.Composer.initialForm.createFromScratch}
						</>
					)}
				</Button>
			</div>

			{/* Step 1: Category Selection */}
			{currentStep === "category" && (
				<div className="space-y-4">
					<h3 className="font-medium text-lg">
						{t.Composer.initialForm.selectCategory}
					</h3>
					<div className="grid grid-cols-2 gap-4 md:grid-cols-3">
						{categories.map((category) => (
							<Card
								key={category.id}
								className="cursor-pointer transition-all hover:border-primary/50"
								onClick={() => handleCategorySelect(category.id)}
							>
								<CardContent className="flex flex-col items-center justify-center p-6 text-center">
									<span className="font-medium">{category.name}</span>
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			)}

			{/* Step 2: Prompt Base Selection */}
			{currentStep === "promptBase" && selectedCategory && (
				<div className="space-y-4">
					<div className="mb-4 flex items-center">
						<Button
							variant="ghost"
							size="sm"
							className="mr-2"
							onClick={handleBack}
						>
							<ArrowLeft className="mr-1 h-4 w-4" />
							{t.common.actions.back}
						</Button>
						<h3 className="font-medium text-lg">
							{t.Composer.initialForm.selectPromptBase}{" "}
							{categories.find((c) => c.id === selectedCategory)?.name}
						</h3>
					</div>

					<div className="grid grid-cols-2 gap-4 md:grid-cols-3">
						{promptBases[selectedCategory as keyof typeof promptBases]?.map(
							(promptBase) => (
								<Card
									key={promptBase.id}
									className="cursor-pointer transition-all hover:border-primary/50"
									onClick={() =>
										handlePromptBaseSelect(promptBase.id, promptBase.name)
									}
								>
									<CardContent className="flex items-center justify-center p-6 text-center">
										<span className="font-medium">{promptBase.name}</span>
									</CardContent>
								</Card>
							),
						)}
					</div>
				</div>
			)}

			{/* Step 3: Final Details Form */}
			{currentStep === "details" && selectedCategory && selectedPromptBase && (
				<div className="space-y-4">
					<div className="mb-4 flex items-center">
						<Button
							variant="ghost"
							size="sm"
							className="mr-2"
							onClick={handleBack}
						>
							<ArrowLeft className="mr-1 h-4 w-4" />
							{t.common.actions.back}
						</Button>
						<h3 className="font-medium text-lg">
							{t.Composer.initialForm.completeComposition}
						</h3>
					</div>

					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(handleSubmit)}
							className="space-y-6"
						>
							<FormField
								control={form.control}
								name="title"
								render={({ field }) => (
									<FormItem className="flex flex-col">
										<FormLabel>{t.Composer.initialForm.title}</FormLabel>
										<FormControl>
											<Input
												placeholder={
													t.Composer.initialForm.compositionTitlePlaceholder
												}
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="subject"
								render={({ field }) => (
									<FormItem className="flex flex-col">
										<FormLabel>Subject</FormLabel>
										<FormControl>
											<Input placeholder="Subject" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="model"
								render={({ field }) => (
									<FormItem className="flex flex-col">
										<FormLabel>{t.Composer.initialForm.model}</FormLabel>
										<Select
											onValueChange={field.onChange}
											defaultValue={field.value}
										>
											<FormControl>
												<SelectTrigger>
													<SelectValue
														placeholder={
															t.Composer.initialForm.selectModelPlaceholder
														}
													/>
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												{compositionModels.map((model) => (
													<SelectItem
														value={model.value}
														key={`${model.label} - ${model.value}`}
													>
														{model.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="prompt"
								render={({ field }) => (
									<FormItem className="flex flex-col">
										<div className="flex items-center gap-2">
											<FormLabel>{t.Composer.initialForm.prompt}</FormLabel>
											<TooltipProvider>
												<Tooltip>
													<TooltipTrigger asChild>
														<div className="cursor-help">
															<HelpCircle className="h-4 w-4 text-muted-foreground" />
														</div>
													</TooltipTrigger>
													<TooltipContent className="w-80 p-2">
														<p className="mb-1 font-medium">
															{t.Composer.initialForm.tooltipImportant}
														</p>
														<p className="mb-1">
															{t.Composer.initialForm.tooltipIncludeFields}
														</p>
														<ul className="list-disc space-y-1 pl-5">
															<li>
																<code className="rounded bg-muted px-1 py-0.5 text-xs">
																	{
																		t.Composer.initialForm.tooltipFields
																			.category
																	}
																</code>
															</li>
															<li>
																<code className="rounded bg-muted px-1 py-0.5 text-xs">
																	{
																		t.Composer.initialForm.tooltipFields
																			.language
																	}
																</code>
															</li>
															<li>
																<code className="rounded bg-muted px-1 py-0.5 text-xs">
																	{t.Composer.initialForm.tooltipFields.persona}
																</code>
															</li>
														</ul>
														<p className="mt-1 text-xs">
															{t.Composer.initialForm.tooltipNote1}
														</p>
														<p className="mt-1 text-xs">
															{t.Composer.initialForm.tooltipNote2}
														</p>
													</TooltipContent>
												</Tooltip>
											</TooltipProvider>
										</div>
										<FormControl>
											<Textarea
												{...field}
												rows={20}
												className="font-mono text-sm"
												placeholder={t.Composer.initialForm.tooltip}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<Button type="submit" className="w-full">
								<ListPlus className="mr-2 h-4 w-4" />
								{t.Composer.initialForm.generateComposition}
							</Button>
						</form>
					</Form>
				</div>
			)}
		</div>
	);
}
