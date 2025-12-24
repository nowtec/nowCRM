"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import type { DocumentId, settingSubscriptionCheck } from "@nowcrm/services";
import { HelpCircle, Pencil, Save, X } from "lucide-react";
import { useMessages } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";
import Editor from "@/components/editor/editor-client";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";

interface ChannelSettingsFormProps {
	initialSubscription: settingSubscriptionCheck;
	initialUnsubscribeText: string;
	baseLink: string;
	settings_id: DocumentId;
}

export function ChannelSettingsForm({
	initialSubscription,
	initialUnsubscribeText,
	baseLink,
	settings_id,
}: ChannelSettingsFormProps) {
	const t = useMessages();

	const formSchema = z.object({
		subscription: z.enum(["verify", "ignore"]),
		unsubscribe_text: z.string().optional(),
	});

	const subscriptionOptions = [
		{ label: t.Admin.Channels.common.action.verify, value: "verify" },
		{ label: t.Admin.Channels.common.action.ignore, value: "ignore" },
	];

	const [isEditing, setIsEditing] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [editorKey, setEditorKey] = useState(0);

	type FormValues = z.infer<typeof formSchema>;

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			subscription: initialSubscription,
			unsubscribe_text: initialUnsubscribeText,
		},
	});
	const onSubmit = async (data: any) => {
		try {
			const { updateSettings } = await import(
				"@/lib/actions/settings/update-settings"
			);
			setIsSaving(true);
			await updateSettings(settings_id, data);
			toast.success(t.Admin.Channels.toast.updateSettings);
			setIsEditing(false);
		} catch (error) {
			toast.error(t.Admin.Channels.toast.updateSettingsError);
			console.error(error);
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)}>
				<Card className="mt-2">
					<CardHeader>
						<div className="flex items-center justify-between">
							<div>
								<CardTitle>{t.Admin.Channels.settings.title}</CardTitle>
								<CardDescription>
									{t.Admin.Channels.settings.description}
								</CardDescription>
							</div>
							<div>
								{isEditing ? (
									<div className="flex space-x-2">
										<Button
											type="submit"
											size="sm"
											className="flex cursor-pointer items-center gap-1"
											disabled={isSaving}
										>
											<Save className="h-4 w-4" />
											{isSaving
												? t.Admin.Channels.common.saveButton.savingText
												: t.Admin.Channels.common.saveButton.save}
										</Button>
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={() => {
												setIsEditing(false);
												form.resetField("unsubscribe_text");
											}}
											className="flex cursor-pointer items-center gap-1"
											disabled={isSaving}
										>
											<X className="h-4 w-4" />
											{t.common.actions.cancel}
										</Button>
									</div>
								) : (
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => setIsEditing(true)}
										className="flex cursor-pointer items-center gap-1"
									>
										<Pencil className="h-4 w-4" />
										{t.common.actions.edit}
									</Button>
								)}
							</div>
						</div>
					</CardHeader>
					<CardContent className="space-y-6">
						<FormField
							control={form.control}
							name="subscription"
							render={({ field }) => (
								<FormItem className="space-y-2">
									<FormLabel>
										{t.Admin.Channels.settings.form.subscription.label}
									</FormLabel>
									<FormControl>
										{isEditing ? (
											<Select
												value={field.value}
												onValueChange={field.onChange}
											>
												<SelectTrigger
													id="subscription"
													className="w-40 cursor-pointer"
												>
													<SelectValue
														placeholder={
															t.Admin.Channels.settings.form.subscription
																.placeholder
														}
													/>
												</SelectTrigger>
												<SelectContent>
													{subscriptionOptions.map((subscription) => (
														<SelectItem
															className="cursor-pointer"
															key={`${subscription.value}`}
															value={subscription.value}
														>
															{subscription.label}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										) : (
											<p className="text-base">
												{subscriptionOptions.find(
													(opt) => opt.value === field.value,
												)?.label || field.value}
											</p>
										)}
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<div className="flex items-center justify-between">
							<div>
								<CardTitle>
									{t.Admin.Channels.settings.form.unscubscribe.title}
								</CardTitle>
								<CardDescription>
									{t.Admin.Channels.settings.form.unscubscribe.description}
								</CardDescription>
							</div>
						</div>
						<FormField
							control={form.control}
							name="unsubscribe_text"
							render={({ field }) => (
								<FormItem className="space-y-2">
									<div className="flex items-center gap-2">
										<FormLabel className="mb-0">
											{t.Admin.Channels.settings.form.unscubscribe.label}
										</FormLabel>
										<TooltipProvider>
											<Tooltip>
												<TooltipTrigger asChild>
													<HelpCircle className="h-4 w-4 cursor-pointer p-0 hover:text-primary" />
												</TooltipTrigger>
												<TooltipContent className="w-[350px] p-3">
													<p className="mb-2 font-medium text-sm">
														{
															t.Admin.Channels.settings.form.unscubscribe
																.tooltip
														}
													</p>
													<div
														className="cursor-pointer rounded-md bg-muted px-2 py-1 font-mono text-primary text-xs hover:bg-muted-foreground/10"
														onClick={() => {
															const link = `${baseLink}/unsubscribe?email=@contact.email`;
															navigator.clipboard.writeText(link);
															toast.success(t.Admin.Channels.toast.linkcopied);
														}}
													>
														{`${baseLink}/unsubscribe?email=@contact.email`}
													</div>
												</TooltipContent>
											</Tooltip>
										</TooltipProvider>
									</div>

									{isEditing && (
										<div className="flex flex-col gap-2">
											<Button
												type="button"
												variant="outline"
												size="sm"
												className="w-fit text-muted-foreground text-sm hover:text-primary"
												onClick={() => {
													const defaultText = `<p>If you wish to unsubscribe, click <a href="${baseLink}/unsubscribe?email=@contact.email" target="_blank" rel="noopener noreferrer">here</a>.</p>`;
													form.setValue("unsubscribe_text", defaultText);
													setEditorKey((prev) => prev + 1);
												}}
											>
												Insert default unsubscribe link
											</Button>

											<p className="text-muted-foreground text-xs leading-relaxed">
												This link will unsubscribe the contact from their{" "}
												<strong>Email</strong> channel by default.
												<br />
												To unsubscribe from other channels, you can manually add
												<code> &channel=SMS</code>, <code>&channel=Push</code>,
												or <code>&channel=All</code> to the link.
											</p>
										</div>
									)}

									<FormControl>
										{isEditing ? (
											<Editor
												key={`unsubscribe_text_${editorKey}`}
												value={field.value || ""}
												onChange={(value) => field.onChange(value)}
											/>
										) : (
											<Editor
												key="unsubscribe_text_edit"
												value={field.value || ""}
												disableToolbar
												editable={false}
											/>
										)}
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</CardContent>
				</Card>
			</form>
		</Form>
	);
}
