"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ListPlus } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { useForm } from "react-hook-form";
import { GrAddCircle } from "react-icons/gr";
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
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({
	contact: z.number(),
	action: z.string(),
	description: z.string().optional(),
});

export default function CreateTaskDialog() {
	const t = useTranslations();

	const router = useRouter();
	const params = useParams<{ locale: string; id: string }>();
	const [dialogOpen, setDialogOpen] = React.useState(false);

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			contact: Number.parseInt(params.id),
			action: "",
			description: "",
		},
	});

	async function onSubmit(values: z.infer<typeof formSchema>) {
		const { default: toast } = await import("react-hot-toast");
		const { createActivityLog } = await import(
			"@/lib/actions/activity_logs/create-activity-log"
		);
		const res = await createActivityLog({ ...values, publishedAt: new Date() });
		if (!res.success) {
			toast.error(
				`${t("Contacts.toasts.errorActivityLog")} ${res.errorMessage}`,
			);
		} else {
			toast.success(t("Contacts.toasts.logCreated", { action: values.action }));
			setDialogOpen(false);
			form.reset();
			router.refresh();
		}
	}

	return (
		<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
			<DialogTrigger asChild>
				<Button
					size="sm"
					className="ml-2 hidden h-8 lg:flex"
					onClick={() => setDialogOpen(true)}
				>
					<GrAddCircle className="mr-2 h-4 w-4" />
					{t("Contacts.activityLog.createLog")}
				</Button>
			</DialogTrigger>
			<DialogContent className="max-h-[90vh] overflow-auto sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>{t("Contacts.activityLog.dialog.title")}</DialogTitle>
					<DialogDescription>
						{t("Contacts.activityLog.dialog.description")}
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
						<FormField
							control={form.control}
							name="action"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel>{t("Contacts.activityLog.action")}</FormLabel>
									<FormControl>
										<Input
											placeholder={t("Contacts.activityLog.action")}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="description"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel>{t("Contacts.activityLog.description")}</FormLabel>
									<FormControl>
										<Textarea
											placeholder={t("Contacts.activityLog.description")}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<Button type="submit" className="w-full">
							<ListPlus className="mr-2 h-4 w-4" />
							{t("common.actions.create")}
						</Button>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
