"use client";

import {
	Download,
	Info,
	Mail,
	Phone,
	PlusCircle,
	RefreshCw,
	Sparkles,
	User,
	UserX,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";

import { formatDateStrapi } from "@/lib/strapiDate";
import type { Contact } from "@/lib/types/new_type/contact";
import { EditDialog } from "./editDialog";
import { EnrichDialog } from "./enrichDialog";
import { PersonalDetailsDialog } from "./personalDetails";

interface PersonalInfoCardProps {
	contact: Contact;
}

function InfoRow({
	icon,
	children,
}: {
	icon: React.ReactNode;
	children: React.ReactNode;
}) {
	return (
		<div className="flex items-center space-x-3">
			{icon}
			<div className="flex-1">{children}</div>
		</div>
	);
}

export function PersonalInfoCard({ contact }: PersonalInfoCardProps) {
	const router = useRouter();
	const t = useTranslations();

	const [isEditing, setIsEditing] = useState(false);
	const [isViewingDetails, setIsViewingDetails] = useState(false);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [anonymizeLoading, setAnonymizeLoading] = useState(false);
	const [exportLoading, setExportLoading] = useState(false);
	const [isEnriching, setIsEnriching] = useState(false);

	const handleAnonymize = async () => {
		const { default: toast } = await import("react-hot-toast");
		const { anonymizeContact } = await import(
			"@/lib/actions/contacts/anonymize-contact"
		);

		try {
			setAnonymizeLoading(true);
			const result = await anonymizeContact(contact.id);
			if (result.success) {
				toast.success(t("Contacts.details.personal.details.anonymize.success"));
				router.refresh();
			} else {
				toast.error(
					result.errorMessage ??
						t("Contacts.details.personal.details.anonymize.error"),
				);
			}
		} catch {
			toast.error(t("Contacts.details.personal.details.anonymize.error"));
		} finally {
			setAnonymizeLoading(false);
			setDialogOpen(false);
		}
	};

	const handleExportUserData = async () => {
		const { default: toast } = await import("react-hot-toast");
		const { exportContact } = await import(
			"@/lib/actions/contacts/export-contact"
		);

		try {
			setExportLoading(true);
			const result = await exportContact(contact.id);
			if (result.success && result.data) {
				const formattedData = JSON.stringify(result.data, null, 2);
				const blob = new Blob([formattedData], { type: "application/json" });
				const url = window.URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.href = url;
				a.download = `contact-${contact.first_name}-${contact.last_name || contact.id}.json`;
				document.body.appendChild(a);
				a.click();
				window.URL.revokeObjectURL(url);
				document.body.removeChild(a);
				toast.success(t("Contacts.details.personal.details.export.success"));
			} else {
				toast.error(t("Contacts.details.personal.details.export.error"));
			}
		} catch {
			toast.error(t("Contacts.details.personal.details.export.error"));
		} finally {
			setExportLoading(false);
		}
	};

	return (
		<>
			<Card>
				<CardHeader>
					<div className="flex items-start justify-between gap-4">
						<div className="space-y-2">
							<CardTitle className="font-semibold text-slate-900 text-xl dark:text-slate-50">
								{t("Contacts.details.personal.info.title")}
							</CardTitle>
							<CardDescription className="text-slate-600 dark:text-slate-400">
								{t("Contacts.details.personal.info.details")}
							</CardDescription>
						</div>
						<div className="flex gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => setIsEditing(true)}
							>
								{t("common.actions.edit")}
							</Button>
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											variant="outline"
											size="sm"
											onClick={() => setIsEnriching(true)}
											className="border-0 bg-gradient-to-r from-primary to-emerald-600 text-white shadow-sm hover:from-primary/90 hover:to-emerald-600/90"
										>
											<Sparkles className="mr-2 h-4 w-4" />
											AI Enrich
										</Button>
									</TooltipTrigger>
									<TooltipContent>
										<p>Enrich contact details with AI</p>
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						</div>
					</div>
				</CardHeader>

				<CardContent className="flex flex-col space-y-3">
					<InfoRow icon={<User className="h-5 w-5 text-primary" />}>
						<p className="font-medium">
							{contact.title?.name || ""} {contact.first_name}{" "}
							{contact.last_name || ""}
						</p>
						<p className="text-muted-foreground text-sm">
							{contact.gender || "Not specified"}
						</p>
						{contact.contact_types.length > 0 && (
							<p className="text-muted-foreground text-sm">
								{contact.contact_types.map((item) => item.name).join(", ")}
							</p>
						)}
					</InfoRow>

					<InfoRow icon={<Mail className="h-5 w-5 text-primary" />}>
						<p>{contact.email || "No email provided"}</p>
					</InfoRow>

					<InfoRow icon={<Phone className="h-5 w-5 text-primary" />}>
						<p>
							{contact.phone || "No office phone"} {contact.phone && "(Office)"}
						</p>
						<p>
							{contact.mobile_phone || "No mobile phone"}{" "}
							{contact.mobile_phone && "(Mobile)"}
						</p>
					</InfoRow>

					<InfoRow icon={<Info className="h-5 w-5 text-primary" />}>
						<p>
							{t("AdvancedFilters.fields.birth_date")}{" "}
							{formatDateStrapi(contact.birth_date)}
						</p>
						<p>
							{t("AdvancedFilters.fields.language")} {contact.language}
						</p>
					</InfoRow>

					<InfoRow icon={<Info className="h-5 w-5 text-primary" />}>
						<p>
							{t("Contacts.details.personal.info.unsubscribeToken")}{" "}
							{contact.unsubscribe_token || "Not provided"}
						</p>
					</InfoRow>

					<div className="flex flex-wrap gap-x-6 gap-y-2 border-t pt-2">
						<InfoRow icon={<PlusCircle className="h-5 w-5 text-emerald-600" />}>
							<p>Created</p>
							<p>{formatDateStrapi(contact.createdAt) || "Unknown"}</p>
						</InfoRow>

						<InfoRow icon={<RefreshCw className="h-5 w-5 text-sky-600" />}>
							<p>Last Updated</p>
							<p>{formatDateStrapi(contact.updatedAt) || "Unknown"}</p>
						</InfoRow>
					</div>
				</CardContent>

				<CardFooter className="flex flex-col space-y-3">
					<TooltipProvider>
						<div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
							<Button
								variant="secondary"
								size="sm"
								className="w-full"
								onClick={() => setIsViewingDetails(true)}
							>
								<span className="truncate">
									{t("Contacts.details.personal.info.viewAdditional")}
								</span>
							</Button>
							<Button variant="secondary" size="sm" disabled className="w-full">
								<span className="truncate">
									{t("Contacts.details.personal.info.viewNotes")}
								</span>
							</Button>
						</div>

						<div className="flex w-full flex-col gap-2">
							{/* Anonymize Dialog */}
							<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
								<DialogTrigger asChild>
									<Button
										size="sm"
										className="flex w-full items-center justify-center gap-2"
									>
										<UserX className="h-4 w-4" />
										<span className="hidden truncate md:inline">
											{t("Contacts.details.personal.details.anonymize.title")}
										</span>
									</Button>
								</DialogTrigger>
								<DialogContent>
									<DialogHeader>
										<DialogTitle>
											{t(
												"Contacts.details.personal.details.anonymize.dialogTitle",
											)}
										</DialogTitle>
									</DialogHeader>
									<DialogDescription>
										{t(
											"Contacts.details.personal.details.anonymize.dialogDescription",
										)}
									</DialogDescription>
									<Button
										variant="default"
										size="sm"
										className="flex w-full items-center justify-center gap-2"
										onClick={handleAnonymize}
										disabled={anonymizeLoading}
									>
										{anonymizeLoading ? (
											<span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
										) : (
											<UserX className="h-4 w-4" />
										)}
										<span className="hidden md:inline">
											{anonymizeLoading
												? t(
														"Contacts.details.personal.details.anonymize.anonymizing",
													)
												: t(
														"Contacts.details.personal.details.anonymize.title",
													)}
										</span>
									</Button>
								</DialogContent>
							</Dialog>

							{/* Export */}
							<Button
								variant="secondary"
								size="sm"
								className="flex w-full items-center justify-center gap-2"
								onClick={handleExportUserData}
								disabled={exportLoading}
							>
								{exportLoading ? (
									<span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
								) : (
									<Download className="h-4 w-4" />
								)}
								<span className="hidden truncate md:inline">
									{exportLoading
										? t("Contacts.details.personal.details.export.exporting")
										: t("Contacts.details.personal.details.export.title")}
								</span>
							</Button>
						</div>
					</TooltipProvider>
				</CardFooter>
			</Card>

			<EditDialog
				contact={contact}
				isOpen={isEditing}
				onClose={() => setIsEditing(false)}
			/>

			<PersonalDetailsDialog
				contact={contact}
				open={isViewingDetails}
				onOpenChange={setIsViewingDetails}
			/>

			<EnrichDialog
				contact={contact}
				isOpen={isEnriching}
				onClose={() => setIsEnriching(false)}
			/>
		</>
	);
}
