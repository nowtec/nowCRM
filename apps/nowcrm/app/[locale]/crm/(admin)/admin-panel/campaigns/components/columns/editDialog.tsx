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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getCampaignCategories } from "@/lib/actions/campaign-categories/get-campaign-category";
import { updateCampaign } from "@/lib/actions/campaigns/update-campaigns";
import type { Campaign } from "@/lib/types/new_type/campaign";
import type { CampaignCategory } from "@/lib/types/new_type/campaignCategory";

interface EditCampaignDialogProps {
	campaign: Campaign;
}

export default function EditCampaignDialog({
	campaign,
}: EditCampaignDialogProps) {
	const t = useMessages();

	const router = useRouter();
	const [dialogOpen, setDialogOpen] = React.useState(false);
	const [categories, setCategories] = React.useState<CampaignCategory[]>([]);

	React.useEffect(() => {
		const fetchCategories = async () => {
			const response = await getCampaignCategories();
			if (response.success && response.data) {
				setCategories(response.data);
			}
		};
		if (dialogOpen) {
			fetchCategories();
		}
	}, [dialogOpen]);

	const formSchema = z.object({
		name: z.string().min(2, {
			message: t.Admin.Campaign.form.nameSchema,
		}),
		description: z.string().optional(),
		campaignCategoryId: z.string().optional(),
	});

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: campaign.name,
			description: campaign.description || "",
			campaignCategoryId: campaign.campaign_category?.id.toString() || "",
		},
	});

	async function onSubmit(values: z.infer<typeof formSchema>) {
		const { default: toast } = await import("react-hot-toast");
		const res = await updateCampaign(
			campaign.id,
			values.name,
			values.description,
			values.campaignCategoryId
				? Number.parseInt(values.campaignCategoryId)
				: undefined,
		);
		if (!res.success) {
			toast.error(`${t.Admin.Campaign.toast.createError}: ${res.errorMessage}`);
		} else {
			toast.success(`${t.Admin.Campaign.toast.campaign} ${values.name}`);
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
					<DialogTitle>{t.Admin.Campaign.dialog.editTitle}</DialogTitle>
					<DialogDescription>
						{t.Admin.Campaign.dialog.editDescription}
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 ">
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t.Admin.Campaign.form.nameLabel}</FormLabel>
									<FormControl>
										<Input
											placeholder={t.Admin.Campaign.form.namePlaceholder}
											{...field}
										/>
									</FormControl>
									<FormDescription>
										{t.Admin.Campaign.form.nameDescription}
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
										{t.Admin.Campaign.form.descriptionLabel}
									</FormLabel>
									<FormControl>
										<Textarea
											placeholder={t.Admin.Campaign.form.descriptionPlaceholder}
											{...field}
										/>
									</FormControl>
									<FormDescription>
										{t.Admin.Campaign.form.descriptionDescription}
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="campaignCategoryId"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t.Admin.Campaign.form.categoryLabel}</FormLabel>
									<Select
										onValueChange={field.onChange}
										defaultValue={field.value}
									>
										<FormControl>
											<SelectTrigger>
												<SelectValue
													placeholder={
														t.Admin.Campaign.form.categoryPlaceholder
													}
												/>
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											{categories.map((category) => (
												<SelectItem
													key={category.id}
													value={category.id.toString()}
												>
													{category.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<FormDescription>
										{t.Admin.Campaign.form.categoryDescription}
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>
						<Button type="submit" className="w-full cursor-pointer">
							<ListPlus className="mr-2 h-4 w-4" />
							{t.Admin.Campaign.action.update}
						</Button>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
