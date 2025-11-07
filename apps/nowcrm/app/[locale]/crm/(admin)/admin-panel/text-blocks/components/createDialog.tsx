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

export default function CreateTextBlockDialog() {
	const t = useMessages().Admin.TextBlock;
	const router = useRouter();
	const [dialogOpen, setDialogOpen] = React.useState(false);
	const [activeTab, setActiveTab] = React.useState<LanguageKeys>("en");

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
			name: "",
			texts: {
				en: "",
				de: "",
				it: "",
				fr: "",
			},
		},
	});

	async function onSubmit(values: z.infer<typeof formSchema>) {
		const { default: toast } = await import("react-hot-toast");
		const { createTextBlock } = await import(
			"@/lib/actions/text_blocks/create-text-block"
		);

		// Create a text block for each locale
		const locales: LanguageKeys[] = ["en", "de", "it", "fr"];
		const results = await Promise.all(
			locales.map(async (locale) => {
				const result = await createTextBlock({
					name: values.name,
					text: values.texts[locale],
					locale,
					publishedAt: new Date(),
				});
				return { locale, result };
			}),
		);

		// Check if any creation failed
		const failures = results.filter((r) => !r.result.success);

		if (failures.length > 0) {
			const errorMessages = failures
				.map((f) => `${f.locale}: ${f.result.errorMessage}`)
				.join(", ");
			toast.error(`${t.toast.createOrganizationTypeError} ${errorMessages}`);
		} else {
			toast.success(
				`${t.toast.organization} ${values.name} ${t.toast.created}`,
			);
			router.refresh();
			setDialogOpen(false);
		}
	}
	function onError(errors: any) {
		const missingLanguages = Object.entries(errors?.texts || {})
			.map(([locale, _error]: [string, any]) => `${locale.toUpperCase()}`)
			.join(", ");

		const message =
			missingLanguages.length > 0
				? `Missing text for: ${missingLanguages}`
				: "Please fill in all required fields.";

		import("react-hot-toast").then(({ default: toast }) => {
			toast.error(message);
		});
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
					{t.action.create}
				</Button>
			</DialogTrigger>
			<DialogContent className="max-h-[80vh] min-w-[70vw]">
				<DialogHeader>
					<DialogTitle>{t.dialog.title}</DialogTitle>
				</DialogHeader>

				<div className="max-h-[calc(80vh-80px)] overflow-y-auto p-1">
					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(onSubmit, onError)}
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
									onValueChange={(value) => setActiveTab(value as LanguageKeys)}
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

							<Button type="submit" className="w-full cursor-pointer">
								<ListPlus className="mr-2 h-4 w-4" />
								{t.action.createOrganizationType}
							</Button>
						</form>
					</Form>
				</div>
			</DialogContent>
		</Dialog>
	);
}
