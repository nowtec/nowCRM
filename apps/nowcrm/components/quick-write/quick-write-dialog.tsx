"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
	Check,
	ChevronsUpDown,
	FileText,
	Loader2,
	RefreshCw,
	Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import * as z from "zod";
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
	Dialog,
	DialogContent,
	DialogDescription,
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
import { Textarea } from "@/components/ui/textarea";
import { quickWrite } from "@/lib/actions/composer/quick-write";
import { cn } from "@/lib/utils";
import {
	getRandomInstruction,
	getRandomPersona,
	WRITING_PERSONAS,
} from "./quick-write-constants";

const quickWriteSchema = z.object({
	model: z.enum(["gpt-4o-mini", "claude"]),
	title: z.string().min(1, "Title is required"),
	language: z.string().optional(),
	additional_context: z.string().optional(),
	target_length: z.string().optional(),
	style: z.string().optional(),
});

type QuickWriteFormData = z.infer<typeof quickWriteSchema>;

interface QuickWriteDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onTextGenerated: (text: string) => void;
	initialTitle?: string;
	existingText?: string;
}

export function QuickWriteDialog({
	open,
	onOpenChange,
	onTextGenerated,
	initialTitle = "",
	existingText = "",
}: QuickWriteDialogProps) {
	const [isLoading, setIsLoading] = useState(false);
	const [personaOpen, setPersonaOpen] = useState(false);
	const [personaValue, setPersonaValue] = useState("");

	const form = useForm<QuickWriteFormData>({
		resolver: zodResolver(quickWriteSchema),
		defaultValues: {
			model: "gpt-4o-mini",
			title: initialTitle,
			language: "",
			additional_context: "",
			target_length: "",
			style: "",
		},
	});

	// Pre-fill with random instruction and persona when dialog opens
	useEffect(() => {
		if (open) {
			const parts = [existingText, initialTitle].filter(Boolean);
			form.setValue("title", parts.join(" - "));

			// Pre-fill with random instruction
			const randomInstruction = getRandomInstruction();
			form.setValue("additional_context", randomInstruction);

			// Pre-fill with random persona
			const randomPersona = getRandomPersona();
			const personaDescription = `${randomPersona.name} - ${randomPersona.description}`;
			setPersonaValue(personaDescription);
			form.setValue("style", personaDescription);
		}
	}, [open, initialTitle, existingText, form]);

	const handleRefreshInstruction = () => {
		const randomInstruction = getRandomInstruction();
		form.setValue("additional_context", randomInstruction);
	};

	const handleRefreshPersona = () => {
		const randomPersona = getRandomPersona();
		const personaDescription = `${randomPersona.name} - ${randomPersona.description}`;
		setPersonaValue(personaDescription);
		form.setValue("style", personaDescription);
	};

	const onSubmit = async (data: QuickWriteFormData) => {
		setIsLoading(true);
		try {
			// Build enhanced context with persona and existing content
			let enhancedContext = data.additional_context || "";

			if (data.style) {
				enhancedContext += `\n\nWrite as: ${data.style}`;
			}

			const response = await quickWrite({
				...data,
				additional_context: enhancedContext,
			});

			if (response.success && response.data) {
				onTextGenerated(response.data.result);
				form.reset();
				setPersonaValue("");
				toast.success("The generated text has been inserted.");
			} else {
				toast.error("Failed to generate text");
			}
		} catch (_error) {
			toast.error("An unexpected error occurred");
		} finally {
			setIsLoading(false);
		}
	};

	// Group personas by category for better organization
	const personasByCategory = WRITING_PERSONAS.reduce(
		(acc, persona) => {
			if (!acc[persona.category]) {
				acc[persona.category] = [];
			}
			acc[persona.category].push(persona);
			return acc;
		},
		{} as Record<string, typeof WRITING_PERSONAS>,
	);

	const hasExistingContent = existingText && existingText.trim().length > 0;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Sparkles className="h-5 w-5" />
						Quick Write
						{hasExistingContent && (
							<FileText className="h-4 w-4 text-muted-foreground" />
						)}
					</DialogTitle>
					<DialogDescription>
						Generate text content using AI. The form is pre-filled with random
						writing guidance and persona.
						{hasExistingContent &&
							" Your existing content will be used as context."}
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<div className="grid grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="model"
								render={({ field }) => (
									<FormItem>
										<FormLabel>AI Model</FormLabel>
										<Select
											onValueChange={field.onChange}
											defaultValue={field.value}
										>
											<FormControl>
												<SelectTrigger>
													<SelectValue placeholder="Select AI model" />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												<SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
												<SelectItem value="claude">Claude</SelectItem>
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="target_length"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Target Length</FormLabel>
										<FormControl>
											<Input
												placeholder="e.g., 100 words, 2 paragraphs"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<FormField
							control={form.control}
							name="title"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Title/Topic *</FormLabel>
									<FormControl>
										<Input
											placeholder="What do you want to write about?"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="grid grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="language"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Language</FormLabel>
										<FormControl>
											<Input placeholder="e.g., English, Spanish" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<FormField
							control={form.control}
							name="style"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel className="flex items-center justify-between">
										Writing Style Persona (Select or type custom)
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={handleRefreshPersona}
											className="h-6 px-2"
										>
											<RefreshCw className="h-3 w-3" />
										</Button>
									</FormLabel>
									<Popover open={personaOpen} onOpenChange={setPersonaOpen}>
										<PopoverTrigger asChild>
											<FormControl>
												<Button
													variant="outline"
													role="combobox"
													aria-expanded={personaOpen}
													className={cn(
														"justify-between",
														!personaValue && "text-muted-foreground",
													)}
												>
													{personaValue || "Select persona or type custom..."}
													<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
												</Button>
											</FormControl>
										</PopoverTrigger>
										<PopoverContent className="w-[400px] p-0">
											<Command>
												<CommandInput
													placeholder="Search personas or type custom..."
													value={personaValue}
													onValueChange={(value) => {
														setPersonaValue(value);
														field.onChange(value);
													}}
												/>
												<CommandList>
													<CommandEmpty>
														<div className="p-2 text-sm">
															<p className="font-medium">
																Create custom persona:
															</p>
															<p className="text-muted-foreground">
																"{personaValue}"
															</p>
														</div>
													</CommandEmpty>
													{Object.entries(personasByCategory).map(
														([category, personas]) => (
															<CommandGroup
																key={category}
																heading={
																	category.charAt(0).toUpperCase() +
																	category.slice(1)
																}
															>
																{personas.map((persona) => {
																	const personaText = `${persona.name} - ${persona.description}`;
																	return (
																		<CommandItem
																			key={persona.id}
																			value={personaText}
																			onSelect={(currentValue) => {
																				setPersonaValue(currentValue);
																				field.onChange(currentValue);
																				setPersonaOpen(false);
																			}}
																		>
																			<Check
																				className={cn(
																					"mr-2 h-4 w-4",
																					personaValue === personaText
																						? "opacity-100"
																						: "opacity-0",
																				)}
																			/>
																			<div>
																				<div className="font-medium">
																					{persona.name}
																				</div>
																				<div className="text-muted-foreground text-sm">
																					{persona.description}
																				</div>
																			</div>
																		</CommandItem>
																	);
																})}
															</CommandGroup>
														),
													)}
												</CommandList>
											</Command>
										</PopoverContent>
									</Popover>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="additional_context"
							render={({ field }) => (
								<FormItem>
									<FormLabel className="flex items-center justify-between">
										Writing Instructions (Pre-filled randomly)
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={handleRefreshInstruction}
											className="h-6 px-2"
										>
											<RefreshCw className="h-3 w-3" />
										</Button>
									</FormLabel>
									<FormControl>
										<Textarea
											placeholder="Writing guidance and additional context..."
											className="min-h-[120px]"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="flex justify-end gap-3 pt-4">
							<Button
								type="button"
								variant="outline"
								onClick={() => onOpenChange(false)}
								disabled={isLoading}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={isLoading}>
								{isLoading ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Generating...
									</>
								) : (
									<>
										<Sparkles className="mr-2 h-4 w-4" />
										Generate Text
									</>
								)}
							</Button>
						</div>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
