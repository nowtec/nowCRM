"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ListPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import {
	FaGlobe,
	FaMoneyBill,
	FaRegBuilding,
	FaRegHandshake,
} from "react-icons/fa";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
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
import { DonationSubscription } from "@nowcrm/services";

// Updated schema
const formSchema = z.object({
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

export default function EditSubscriptionTransactionDialog({
	subscription,
	setDialogOpen,
}: {
	subscription: DonationSubscription;
	setDialogOpen: any;
}) {
	const router = useRouter();
	const t = useTranslations();

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			payment_method: subscription.payment_method || "",
			currency: subscription.currency || "",
			amount: subscription.ammount || 0,
			payment_provider: subscription.payment_provider || "",
			interval: subscription.interval || "",
			subscription_token: subscription.subscription_token || "",
			raw_data: subscription.raw_data || "",
		},
	});

	async function onSubmit(values: z.infer<typeof formSchema>) {
		const { default: toast } = await import("react-hot-toast");
		const { updateDonationSubscription } = await import(
			"@/lib/actions/donationSubscriptions/update-donation-subscription"
		);
		const res = await updateDonationSubscription(subscription.documentId, values);
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
			setDialogOpen(false);
			router.refresh();
		}
	}

	return (
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
									{t("Contacts.transactionSubscription.fields.payment_method")}
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
					<Button type="submit" className="w-full">
						<ListPlus className="mr-2 h-4 w-4" />
						{t("common.actions.update")}
					</Button>
				</form>
			</Form>
		</DialogContent>
	);
}
