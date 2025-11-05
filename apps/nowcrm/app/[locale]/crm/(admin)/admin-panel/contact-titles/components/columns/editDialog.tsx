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
import { updateContactTitle } from "@/lib/actions/contact-titles/update-contact-title";
import type { ContactTitle } from "@/lib/types/new_type/contact_title";

interface EditContactTitleDialogProps {
	contactTitle: ContactTitle;
}

export default function EditContactTitleDialog({
	contactTitle,
}: EditContactTitleDialogProps) {
	const t = useMessages();

	const router = useRouter();
	const [dialogOpen, setDialogOpen] = React.useState(false);

	const formSchema = z.object({
		name: z.string().min(2, {
			message: t.Admin.ContactTitle.form.nameSchema,
		}),
	});

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: contactTitle.name,
		},
	});

	async function onSubmit(values: z.infer<typeof formSchema>) {
		const { default: toast } = await import("react-hot-toast");
		const res = await updateContactTitle(contactTitle.id, values.name);
		if (!res.success) {
			toast.error(
				`${t.Admin.ContactTitle.toast.createError}: ${res.errorMessage}`,
			);
		} else {
			toast.success(
				`${t.Admin.ContactTitle.toast.contactTitle} ${values.name}`,
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
					<DialogTitle>{t.Admin.ContactTitle.dialog.editTitle}</DialogTitle>
					<DialogDescription>
						{t.Admin.ContactTitle.dialog.editDescription}
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 ">
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t.Admin.ContactTitle.form.nameLabel}</FormLabel>
									<FormControl>
										<Input
											placeholder={t.Admin.ContactTitle.form.namePlaceholder}
											{...field}
										/>
									</FormControl>
									<FormDescription>
										{t.Admin.ContactTitle.form.nameDescription}
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>
						<Button type="submit" className="w-full cursor-pointer">
							<ListPlus className="mr-2 h-4 w-4" />
							{t.Admin.ContactTitle.action.update}
						</Button>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
