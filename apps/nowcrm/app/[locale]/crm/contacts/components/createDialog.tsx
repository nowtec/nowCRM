"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { ExternalLink, ListPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { useForm } from "react-hook-form";
import { FaBuilding, FaGlobe, FaMapMarkerAlt, FaUser } from "react-icons/fa";
import { FaMessage } from "react-icons/fa6";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { RouteConfig } from "@/lib/config/RoutesConfig";

export default function CreateContactDialog() {
	const t = useTranslations();
	const router = useRouter();

	const formSchema = z.object({
		first_name: z.string().min(2, {
			message: t("Contacts.createContact.contactSchema"),
		}),
		last_name: z.string().optional(),
		email: z.string().optional(),
		address_line1: z.string().optional(),
		language: z.string(),
	});

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			first_name: "",
		},
	});

	// State to differentiate the submission action.
	// "create" will close the dialog while "continue" will reset the form to allow further entries.
	const [submitAction, setSubmitAction] = React.useState<"create" | "continue">(
		"create",
	);
	const [dialogOpen, setDialogOpen] = React.useState(false);
	const [existingContact, setExistingContact] = React.useState<null | {
		id: number;
	}>(null);

	async function onSubmit(values: z.infer<typeof formSchema>) {
		const { default: toast } = await import("react-hot-toast");
		const { createContact } = await import(
			"@/lib/actions/contacts/create-contact"
		);
		const { getContactByEmail } = await import(
			"@/lib/actions/contacts/getContactByEmail"
		);

		if (values.email) {
			const existing = await getContactByEmail(values.email);
			if (existing) {
				setExistingContact({ id: existing.id });
				form.setError("email", {
					type: "manual",
					message: "This email address is already associated to a contact.",
				});
				return;
			} else {
				setExistingContact(null);
			}
		}

		const res = await createContact({ ...values, publishedAt: new Date() });
		console.log(res);
		if (!res.success) {
			toast.error(
				`${t("Contacts.createContact.toast.error")} ${res.errorMessage}`,
			);
		} else {
			// toast.success(`Contact ${values.first_name} created`);
			toast.success(
				t("Contacts.createContact.toast.success", { name: values.first_name }),
			);
			if (submitAction === "continue") {
				// Reset the form to continue creating new organizations.
				form.reset();
				router.refresh();
			} else {
				// For the "create" action, refresh and let the dialog close.
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
					className="ml-2 hidden h-10 lg:flex"
					onClick={() => setDialogOpen(true)}
				>
					<GrAddCircle className="h-4 w-4" />
					{t("common.actions.create")}
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>{t("Contacts.createContact.title")}</DialogTitle>
					<DialogDescription>
						{t("Contacts.createContact.description")}
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
						<FormField
							control={form.control}
							name="first_name"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel className="flex items-center">
										<FaBuilding className="mr-2 text-primary" />{" "}
										{t("common.labels.first_name")}
									</FormLabel>
									<FormControl>
										<Input
											placeholder={t("common.labels.first_name")}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="last_name"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel className="flex items-center">
										<FaUser className="mr-2 text-primary" />
										{t("common.labels.last_name")}
									</FormLabel>
									<FormControl>
										<Input
											placeholder={t("common.labels.last_name")}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="email"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel className="flex items-center">
										<FaMessage className="mr-2 text-primary" />{" "}
										{t("common.labels.email")}
									</FormLabel>
									<FormControl>
										<Input placeholder={t("common.labels.email")} {...field} />
									</FormControl>
									{form.formState.errors.email && existingContact ? (
										<div className="mt-1 rounded-md text-sm">
											<div className="flex items-center">
												<ExclamationTriangleIcon className="mr-1 h-4 w-4 text-yellow-600" />
												{form.formState.errors.email.message}{" "}
											</div>
											<Link
												href={`${RouteConfig.contacts.single.base(existingContact.id)}`}
												target="_blank"
												rel="noopener noreferrer"
												className="flex items-center font-medium underline hover:text-red-800"
											>
												See the contact
												<ExternalLink className="ml-1 h-4 w-4" />
											</Link>
										</div>
									) : (
										<FormMessage />
									)}
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="address_line1"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel className="flex items-center">
										<FaMapMarkerAlt className="mr-2 text-primary" />{" "}
										{t("common.labels.address_line1")}
									</FormLabel>
									<FormControl>
										<Input
											placeholder={t("common.labels.address_line1")}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="language"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel className="flex items-center">
										<FaGlobe className="mr-2 text-primary" />{" "}
										{t("common.labels.language")}
									</FormLabel>
									<Select onValueChange={field.onChange} value={field.value}>
										<FormControl>
											<SelectTrigger>
												<SelectValue
													placeholder={t("common.labels.selectLanguage")}
												/>
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											<SelectItem value="en">
												{t("common.languages.en")}
											</SelectItem>
											<SelectItem value="de">
												{t("common.languages.de")}
											</SelectItem>
											<SelectItem value="fr">
												{t("common.languages.fr")}
											</SelectItem>
											<SelectItem value="it">
												{t("common.languages.it")}
											</SelectItem>
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>
						{/* Two submit buttons: one closes the dialog, the other continues */}
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
