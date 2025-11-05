"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ListPlus } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { useForm } from "react-hook-form";
import {
	FaCreditCard,
	FaGlobe,
	FaMoneyBill,
	FaRegBuilding,
	FaRegHandshake,
	FaUser,
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

export default function CreateTransactionDialog() {
	const router = useRouter();
	const params = useParams<{ locale: string; id: string }>();
	const t = useTranslations();

	const formSchema = z.object({
		contact: z.number(),
		card_holder_name: z.string().min(2, {
			message: t("Contacts.transactions.cardSchema"),
		}),
		amount: z.coerce.number().optional(),
		payment_method: z.string().optional(),
		payment_provider: z.string().optional(),
		user_ip: z.string().optional(),
		status: z.string().optional(),
		currency: z.string().optional(),
		user_agent: z.string().optional(),
		epp_transaction_id: z.string().optional(),
		raw_data: z.string().optional(),
		campaign_id: z.string().optional(),
		campaign_name: z.string().optional(),
		purpose: z.string().optional(),
	});

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			contact: Number.parseInt(params.id),
			card_holder_name: "",
			amount: 0,
			payment_method: "",
			payment_provider: "",
			user_ip: "",
			status: "",
			currency: "",
			user_agent: "",
			epp_transaction_id: "",
			raw_data: "",
			campaign_id: "",
			campaign_name: "",
			purpose: "",
		},
	});

	const [submitAction, setSubmitAction] = React.useState<"create" | "continue">(
		"create",
	);
	const [dialogOpen, setDialogOpen] = React.useState(false);

	async function onSubmit(values: z.infer<typeof formSchema>) {
		const { default: toast } = await import("react-hot-toast");
		const { createTransaction } = await import(
			"@/lib/actions/donationTransactions/create-transaction"
		);
		const res = await createTransaction({ ...values, publishedAt: new Date() });
		if (!res.success) {
			toast.error(`${t("Contacts.transactions.error")} ${res.errorMessage}`);
		} else {
			toast.success(
				t("Contacts.transactions.success", { name: values.card_holder_name }),
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
					{t("Contacts.transactions.createTitle")}
				</Button>
			</DialogTrigger>
			<DialogContent className="max-h-[90vh] overflow-auto sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>{t("Contacts.transactions.createTitle")}</DialogTitle>
					<DialogDescription>
						{t("Contacts.transactions.descriptionCreate")}
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
						<FormField
							control={form.control}
							name="card_holder_name"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel className="flex items-center">
										<FaCreditCard className="mr-2 text-primary" />
										{t("Contacts.transactions.fields.card_holder_name")}
									</FormLabel>
									<FormControl>
										<Input
											placeholder={t(
												"Contacts.transactions.fields.card_holder_name",
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
										<FaMoneyBill className="mr-2 text-primary" />
										{t("Contacts.transactions.fields.amount")}
									</FormLabel>
									<FormControl>
										<Input
											type="number"
											placeholder={t("Contacts.transactions.fields.amount")}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="payment_method"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel className="flex items-center">
										<FaRegBuilding className="mr-2 text-primary" />
										{t("Contacts.transactions.fields.payment_method")}
									</FormLabel>
									<FormControl>
										<Input
											placeholder={t(
												"Contacts.transactions.fields.payment_method",
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
										<FaRegBuilding className="mr-2 text-primary" />
										{t("Contacts.transactions.fields.payment_provider")}
									</FormLabel>
									<FormControl>
										<Input
											placeholder={t(
												"Contacts.transactions.fields.payment_provider",
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
							name="user_ip"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel className="flex items-center">
										<FaUser className="mr-2 text-primary" />
										{t("Contacts.transactions.fields.user_ip")}
									</FormLabel>
									<FormControl>
										<Input
											placeholder={t("Contacts.transactions.fields.user_ip")}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="status"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel className="flex items-center">
										<FaGlobe className="mr-2 text-primary" />
										{t("Contacts.transactions.fields.status")}
									</FormLabel>
									<FormControl>
										<Input
											placeholder={t("Contacts.transactions.fields.status")}
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
										<FaGlobe className="mr-2 text-primary" />
										{t("Contacts.transactions.fields.currency")}
									</FormLabel>
									<FormControl>
										<Input
											placeholder={t("Contacts.transactions.fields.currency")}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="user_agent"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel className="flex items-center">
										<FaUser className="mr-2 text-primary" />
										{t("Contacts.transactions.fields.user_agent")}
									</FormLabel>
									<FormControl>
										<Input
											placeholder={t("Contacts.transactions.fields.user_agent")}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="epp_transaction_id"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel className="flex items-center">
										<FaRegHandshake className="mr-2 text-primary" />
										{t("Contacts.transactions.fields.epp_transaction_id")}
									</FormLabel>
									<FormControl>
										<Input
											placeholder={t(
												"Contacts.transactions.fields.epp_transaction_id",
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
										<FaRegHandshake className="mr-2 text-primary" />
										{t("Contacts.transactions.fields.raw_data")}
									</FormLabel>
									<FormControl>
										<Input
											placeholder={t("Contacts.transactions.fields.raw_data")}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="campaign_id"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel className="flex items-center">
										<FaRegHandshake className="mr-2 text-primary" />
										{t("Contacts.transactions.fields.campaign_id")}
									</FormLabel>
									<FormControl>
										<Input
											placeholder={t(
												"Contacts.transactions.fields.campaign_id",
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
							name="campaign_name"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel className="flex items-center">
										<FaRegHandshake className="mr-2 text-primary" />
										{t("Contacts.transactions.fields.campaign_name")}
									</FormLabel>
									<FormControl>
										<Input
											placeholder={t(
												"Contacts.transactions.fields.campaign_name",
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
							name="purpose"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel className="flex items-center">
										<FaRegHandshake className="mr-2 text-primary" />
										{t("Contacts.transactions.fields.purpose")}
									</FormLabel>
									<FormControl>
										<Input
											placeholder={t("Contacts.transactions.fields.purpose")}
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
