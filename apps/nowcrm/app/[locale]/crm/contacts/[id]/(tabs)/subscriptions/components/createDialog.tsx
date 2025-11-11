"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ListPlus } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { useForm } from "react-hook-form";
import { GrAddCircle } from "react-icons/gr";
import * as z from "zod";
import { AsyncSelectField } from "@/components/autoComplete/asyncSelectField";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";

const formSchema = z.object({
	channel: z.object({
		value: z.string(),
		label: z.string(),
	}),
	contact: z.string(),
});

export default function CreateListDialog() {
	const router = useRouter();
	const [dialogOpen, setDialogOpen] = React.useState(false);
	const params = useParams<{ locale: string; id: string }>();
	const t = useTranslations("Contacts.subscriptions");

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			channel: undefined,
			contact: (params.id),
		},
	});

	async function onSubmit(values: z.infer<typeof formSchema>) {
		const { default: toast } = await import("react-hot-toast");
		const { createSubscription } = await import(
			"@/lib/actions/subscriptions/create-subscription"
		);
		const { getSubscription } = await import(
			"@/lib/actions/subscriptions/get-subscription"
		);
		const exists = await getSubscription(values.contact, values.channel.value);
		if (exists) {
			toast.error(t("dublicate", { channel: values.channel.label }));
			return;
		}
		const res = await createSubscription(values.channel.value, values.contact);
		if (!res.success) {
			toast.error(`${t("error")} ${res.errorMessage}`);
		} else {
			toast.success(t("success", { channel: values.channel.label }));
			router.refresh();
			form.reset();
			setDialogOpen(false);
		}
	}

	return (
		<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
			<DialogTrigger asChild>
				<Button size="sm" className="ml-2 hidden h-8 lg:flex">
					<GrAddCircle className="mr-2 h-4 w-4" />
					{t("button")}
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>{t("title")}</DialogTitle>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 ">
						<AsyncSelectField
							name="channel"
							label={t("channel")}
							serviceName="channelsService"
							form={form}
							useFormClear={true}
						/>
						<Button type="submit" className="w-full">
							<ListPlus className="mr-2 h-4 w-4" />
							{t("button")}
						</Button>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
