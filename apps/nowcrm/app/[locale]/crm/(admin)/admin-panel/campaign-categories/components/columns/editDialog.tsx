"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ListPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMessages } from "next-intl";
import * as React from "react";
import { useForm } from "react-hook-form";
import { FiEdit } from "react-icons/fi";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateCampaignCategory } from "@/lib/actions/campaign-categories/update-campaign-category";
import type { CampaignCategory } from "@/lib/types/new_type/campaignCategory";

interface EditCampaignCategoryDialogProps {
	campaignCategory: CampaignCategory;
}

export default function EditCampaignCategoryDialog({
	campaignCategory,
}: EditCampaignCategoryDialogProps) {
	const t = useMessages();

	const router = useRouter();
	const [dialogOpen, setDialogOpen] = React.useState(false);

	const formSchema = z.object({
		name: z.string().min(2, {
			message: t.Admin.CampaignCategory.form.nameSchema,
		}),
		description: z.string().optional(),
	});

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: campaignCategory.name,
			description: campaignCategory.description || "",
		},
	});

	async function onSubmit(values: z.infer<typeof formSchema>) {
		const { default: toast } = await import("react-hot-toast");
		const res = await updateCampaignCategory(
			campaignCategory.id,
			values.name,
			values.description,
		);
		if (!res.success) {
			toast.error(
				`${t.Admin.CampaignCategory.toast.createError}: ${res.errorMessage}`,
			);
		} else {
			toast.success(
				`${t.Admin.CampaignCategory.toast.campaignCategory} ${values.name}`,
			);
			router.refresh();
			setDialogOpen(false);
		}
	}

	return (
		<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
			<DialogTrigger asChild>
				<Button size="sm" variant="ghost" className="h-8 cursor-pointer">
					<FiEdit className="h-4 w-4" />
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>{t.Admin.CampaignCategory.dialog.editTitle}</DialogTitle>
					<DialogDescription>
						{t.Admin.CampaignCategory.dialog.editDescription}
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 ">
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										{t.Admin.CampaignCategory.form.nameLabel}
									</FormLabel>
									<FormControl>
										<Input
											placeholder={
												t.Admin.CampaignCategory.form.namePlaceholder
											}
											{...field}
										/>
									</FormControl>
									<FormDescription>
										{t.Admin.CampaignCategory.form.nameDescription}
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="description"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										{t.Admin.CampaignCategory.form.descriptionLabel}
									</FormLabel>
									<FormControl>
										<Textarea
											placeholder={
												t.Admin.CampaignCategory.form.descriptionPlaceholder
											}
											{...field}
										/>
									</FormControl>
									<FormDescription>
										{t.Admin.CampaignCategory.form.descriptionDescription}
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>
						<Button type="submit" className="w-full cursor-pointer">
							<ListPlus className="mr-2 h-4 w-4" />
							{t.Admin.CampaignCategory.action.update}
						</Button>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
