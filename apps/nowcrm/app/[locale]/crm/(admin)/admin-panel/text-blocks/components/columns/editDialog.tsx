"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { HelpCircle, ListPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMessages } from "next-intl";
import * as React from "react";
import { useForm } from "react-hook-form";
import { GrAddCircle } from "react-icons/gr";
import * as z from "zod";
import Editor from "@/components/editor/Editor";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { LanguageKeys } from "@/lib/static/languages";
import type { TextBlock } from "@/lib/types/new_type/text_blocks";

interface EditTextBlockDialogProps {
	textBlockName: string;
}

export default function EditTextBlockDialog({
	textBlockName,
}: EditTextBlockDialogProps) {
	const t = useMessages().Admin.TextBlock;
	const router = useRouter();
	const [dialogOpen, setDialogOpen] = React.useState(false);
	const [activeTab, setActiveTab] = React.useState<LanguageKeys>("en");
	const [textblocks, setTextblocks] = React.useState<
		{
			locale: string;
			data: TextBlock;
		}[]
	>([]);
	const [isLoading, setIsLoading] = React.useState(false);

	// Transform textblocks array into an object keyed by locale
	const textBlocksByLocale = React.useMemo(() => {
		const result: Record<string, string> = {
			en: "",
			de: "",
			it: "",
			fr: "",
		};

		for (const block of textblocks) {
			if (block.locale in result) {
				result[block.locale as LanguageKeys] = block.data.text;
			}
		}

		return result;
	}, [textblocks]);

	const formSchema = z.object({
		name: z.string().min(1, "Name is required"),
		texts: z.object({
			en: z.string().min(1, "English text is required"),
			de: z.string().min(1, "German text is required"),
			it: z.string().min(1, "Italian text is required"),
			fr: z.string().min(1, "French text is required"),
		}),
	});

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: textBlockName,
			texts: textBlocksByLocale,
		},
	});

	// Fetch textblocks data when dialog is opened
	React.useEffect(() => {
		async function fetchTextBlocks() {
			if (dialogOpen) {
				setIsLoading(true);
				try {
					const { getLocalizedTextBlock } = await import(
						"@/lib/actions/text_blocks/get-localized-text-block"
					);
					const data = await getLocalizedTextBlock(textBlockName);
					setTextblocks(data.data as any);

					// Update form values with fetched data
					const textsByLocale: Record<string, string> = {
						en: "",
						de: "",
						it: "",
						fr: "",
					};

					for (const block of data.data ?? []) {
						if (block.locale in textsByLocale) {
							textsByLocale[block.locale as LanguageKeys] = block.data.text;
						}
					}

					form.reset({
						name: textBlockName,
						texts: textsByLocale,
					});
				} catch (error) {
					console.error("Error fetching text blocks:", error);
				} finally {
					setIsLoading(false);
				}
			}
		}

		fetchTextBlocks();
	}, [dialogOpen, textBlockName, form]);

	async function onSubmit(values: z.infer<typeof formSchema>) {
		console.log("Updating text block with values:", values);
		setIsLoading(true);

		const { default: toast } = await import("react-hot-toast");
		const { updateTextBlock } = await import(
			"@/lib/actions/text_blocks/update-text-block"
		);

		// Update text block for each locale
		const locales: LanguageKeys[] = ["en", "de", "it", "fr"];
		const results = await Promise.all(
			locales.map(async (locale) => {
				// Find the textblock with the matching locale to get its ID
				const textblock = textblocks.find((block) => block.locale === locale);
				const id = textblock?.data.id;

				if (!id) {
					return {
						locale,
						result: {
							success: false,
							errorMessage: "No ID found for this locale",
						},
					};
				}

				const result = await updateTextBlock(id, {
					name: values.name,
					text: values.texts[locale],
					locale,
					publishedAt: new Date(),
				});
				return { locale, result };
			}),
		);

		// Check if any update failed
		const failures = results.filter((r) => !r.result.success);
		setIsLoading(false);

		if (failures.length > 0) {
			const errorMessages = failures
				.map((f) => `${f.locale}: ${f.result.errorMessage}`)
				.join(", ");
			toast.error(`${t.toast.updateTextBlockError} ${errorMessages}`);
		} else {
			toast.success(
				`${t.toast.organization} ${values.name} ${t.toast.updated}`,
			);
			router.refresh();
			setDialogOpen(false);
		}
	}

	const locales: { key: LanguageKeys; label: string }[] = [
		{ key: "en", label: "English" },
		{ key: "de", label: "Deutsch" },
		{ key: "it", label: "Italiano" },
		{ key: "fr", label: "Français" },
	];

	return (
		<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
			<DialogTrigger asChild>
				<Button size="sm" className="ml-2 hidden h-8 cursor-pointer lg:flex">
					<GrAddCircle className="mr-2 h-4 w-4" />
					{t.action.edit || "Edit"}
				</Button>
			</DialogTrigger>
			<DialogContent className="max-h-[80vh] min-w-[70vw]">
				<DialogHeader>
					<DialogTitle>{t.dialog.editTitle}</DialogTitle>
				</DialogHeader>

				<div className="max-h-[calc(80vh-80px)] overflow-y-auto p-1">
					{isLoading && (
						<div className="flex justify-center py-8">
							<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
						</div>
					)}
					{!isLoading && (
						<Form {...form}>
							<form
								onSubmit={form.handleSubmit(onSubmit)}
								className="space-y-6 pr-2"
							>
								<FormField
									control={form.control}
									name="name"
									render={({ field }) => (
										<FormItem>
											<div className="flex items-center">
												<FormLabel>{t.form.label}</FormLabel>
												<TooltipProvider>
													<Tooltip>
														<TooltipTrigger asChild>
															<div className="cursor-help">
																<HelpCircle className="ml-3 h-4 w-4 text-muted-foreground" />
															</div>
														</TooltipTrigger>
														<TooltipContent side="top">
															<p>{t.form.tooltip_row_1}</p>
															<p>{t.form.tooltip_row_2}</p>
														</TooltipContent>
													</Tooltip>
												</TooltipProvider>
											</div>
											<FormControl>
												<Input placeholder={t.form.placeholder} {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<div className="space-y-4">
									<Tabs
										defaultValue="en"
										value={activeTab}
										onValueChange={(value) =>
											setActiveTab(value as LanguageKeys)
										}
									>
										<TabsList className="grid grid-cols-4">
											{locales.map((locale) => (
												<TabsTrigger key={locale.key} value={locale.key}>
													{locale.label}
												</TabsTrigger>
											))}
										</TabsList>

										{locales.map((locale) => (
											<TabsContent key={locale.key} value={locale.key}>
												<FormField
													control={form.control}
													name={`texts.${locale.key}`}
													render={({ field }) => (
														<FormItem>
															<div className="flex items-center">
																<FormLabel>{`${locale.label} ${t.form.textLabel}`}</FormLabel>
															</div>
															<FormControl>
																<Editor
																	key={`unsubscribe_text`}
																	value={field.value || t.form.textPlaceholder}
																	onChange={(value) => field.onChange(value)}
																/>
															</FormControl>
															<FormMessage />
														</FormItem>
													)}
												/>
											</TabsContent>
										))}
									</Tabs>
								</div>

								<Button
									type="submit"
									className="w-full cursor-pointer"
									disabled={isLoading}
								>
									{isLoading ? (
										<>
											<div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
											Updating...
										</>
									) : (
										<>
											<ListPlus className="mr-2 h-4 w-4" />
											{t.action.updateTextBlock}
										</>
									)}
								</Button>
							</form>
						</Form>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
