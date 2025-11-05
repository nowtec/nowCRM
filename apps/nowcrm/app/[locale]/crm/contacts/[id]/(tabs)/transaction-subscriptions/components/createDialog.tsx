"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ListPlus } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { useForm } from "react-hook-form";
import {
	FaGlobe,
	FaMoneyBill,
	FaRegBuilding,
	FaRegHandshake,
} from "react-icons/fa";
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

// Updated schema
const formSchema = z.object({
	contact: z.number(),
	payment_method: z.string(),
	currency: z.string(),
	amount: z.number(),
	payment_provider: z.string(),
	interval: z.string(),
	subscription_token: z.string(),
	raw_data: z.string(),
	status: z.string().optional(),
	user_ip: z.string().optional(),
	user_agent: z.string().optional(),
	epp_transaction_id: z.string().optional(),
	campaign_id: z.string().optional(),
	campaign_name: z.string().optional(),
	purpose: z.string().optional(),
});

export default function CreateTransactionDialog() {
	const router = useRouter();
	const params = useParams<{ locale: string; id: string }>();
	const t = useTranslations();

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			contact: Number.parseInt(params.id),
			payment_method: "",
			currency: "",
			amount: 0,
			payment_provider: "",
			interval: "",
			subscription_token: "",
			raw_data: "",
		},
	});

	const [submitAction, setSubmitAction] = React.useState<"create" | "continue">(
		"create",
	);
	const [dialogOpen, setDialogOpen] = React.useState(false);

	async function onSubmit(values: z.infer<typeof formSchema>) {
		const { default: toast } = await import("react-hot-toast");
		const { createDonationSubscription } = await import(
			"@/lib/actions/donationSubscriptions/create-donation-subscrpition"
		);
		const res = await createDonationSubscription({
			...values,
			publishedAt: new Date(),
		});
		if (!res.success) {
			toast.error(
				`${t("Contacts.transactionSubscription.error")} ${res.errorMessage}`,
			);
		} else {
			toast.success(
				t("Contacts.transactionSubscription.success", {
					name: values.payment_provider,
				}),
			);
			if (submitAction === "continue") {
				form.reset();
				router.refresh();
			} else {
				setDialogOpen(false);
				form.reset();
				router.refresh();
			}
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
					{t("Contacts.transactionSubscription.createSubscription")}
				</Button>
			</DialogTrigger>
			<DialogContent className="max-h-[90vh] overflow-auto sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>
						{t("Contacts.transactionSubscription.createTransaction")}
					</DialogTitle>
					<DialogDescription>
						{t("Contacts.transactionSubscription.description")}
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
						<FormField
							control={form.control}
							name="payment_method"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel className="flex items-center">
										<FaRegBuilding className="mr-2 text-primary" />{" "}
										{t(
											"Contacts.transactionSubscription.fields.payment_method",
										)}
									</FormLabel>
									<FormControl>
										<Input
											placeholder={t(
												"Contacts.transactionSubscription.fields.payment_method",
											)}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="currency"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel className="flex items-center">
										<FaGlobe className="mr-2 text-primary" />{" "}
										{t("Contacts.transactionSubscription.fields.currency")}
									</FormLabel>
									<FormControl>
										<Input
											placeholder={t(
												"Contacts.transactionSubscription.fields.currency",
											)}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="amount"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel className="flex items-center">
										<FaMoneyBill className="mr-2 text-primary" />{" "}
										{t("Contacts.transactionSubscription.fields.amount")}
									</FormLabel>
									<FormControl>
										<Input
											type="number"
											placeholder={t(
												"Contacts.transactionSubscription.fields.amount",
											)}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="payment_provider"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel className="flex items-center">
										<FaRegBuilding className="mr-2 text-primary" />{" "}
										{t(
											"Contacts.transactionSubscription.fields.payment_provider",
										)}
									</FormLabel>
									<FormControl>
										<Input
											placeholder={t(
												"Contacts.transactionSubscription.fields.payment_provider",
											)}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="interval"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel className="flex items-center">
										<FaRegHandshake className="mr-2 text-primary" />{" "}
										{t("Contacts.transactionSubscription.fields.interval")}
									</FormLabel>
									<FormControl>
										<Input
											placeholder={t(
												"Contacts.transactionSubscription.fields.interval",
											)}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="subscription_token"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel className="flex items-center">
										<FaRegHandshake className="mr-2 text-primary" />{" "}
										{t(
											"Contacts.transactionSubscription.fields.subscription_token",
										)}
									</FormLabel>
									<FormControl>
										<Input
											placeholder={t(
												"Contacts.transactionSubscription.fields.subscription_token",
											)}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="raw_data"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel className="flex items-center">
										<FaRegHandshake className="mr-2 text-primary" />{" "}
										{t("Contacts.transactionSubscription.fields.raw_data")}
									</FormLabel>
									<FormControl>
										<Input
											placeholder={t(
												"Contacts.transactionSubscription.fields.raw_data",
											)}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<div className="flex space-x-2">
							<Button
								type="submit"
								onClick={() => setSubmitAction("create")}
								className="w-full"
							>
								<ListPlus className="mr-2 h-4 w-4" />
								{t("common.actions.create")}
							</Button>
							<Button
								type="submit"
								onClick={() => setSubmitAction("continue")}
								className="w-full"
							>
								<ListPlus className="mr-2 h-4 w-4" />
								{t("common.actions.continueCreating")}
							</Button>
						</div>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
