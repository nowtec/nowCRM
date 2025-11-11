"use client";
import {
	Briefcase,
	Check,
	Copy,
	ExternalLink,
	Facebook,
	Globe,
	Linkedin,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { FaXTwitter } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { RouteConfig } from "@/lib/config/RoutesConfig";
import { Contact } from "@nowcrm/services";
import { EditDialogProfessional } from "./editDialogProfessional";

interface ProfessionalInfoCardProps {
	contact: Contact;
}

export function ProfessionalInfoCard({ contact }: ProfessionalInfoCardProps) {
	const t = useTranslations();
	const [isEditing, setIsEditing] = useState(false);

	const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

	const copyToClipboard = async (text: string) => {
		try {
			await navigator.clipboard.writeText(text);
			setCopiedUrl(text);
			setTimeout(() => setCopiedUrl(null), 2000);
		} catch (err) {
			console.error("Failed to copy:", err);
		}
	};

	// Check if any social/web URLs exist
	const hasUrls =
		contact.website_url ||
		contact.linkedin_url ||
		contact.facebook_url ||
		contact.twitter_url;

	return (
		<>
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center justify-between">
						<span>{t("Contacts.details.professional.title")}</span>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setIsEditing(true)}
						>
							{t("common.actions.edit")}
						</Button>
					</CardTitle>
					<CardDescription>
						{t("Contacts.details.professional.description")}
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-start space-x-3">
						<Briefcase className="mt-0.5 h-5 w-5 text-muted-foreground" />
						<div>
							{contact.function && (
								<p>
									<strong>{t("AdvancedFilters.fields.role")}:</strong>{" "}
									{contact.function}
								</p>
							)}
							{contact.organization && (
								<p>
									<strong>{t("AdvancedFilters.fields.organization")}:</strong>
									<Link
										href={RouteConfig.organizations.single.base(
											contact.organization.documentId,
										)}
									>
										{" "}
										{contact.organization.name}
									</Link>
								</p>
							)}
							{contact.department && (
								<p>
									<strong>{t("AdvancedFilters.fields.department")}:</strong>{" "}
									{contact.department.name}
								</p>
							)}
							{contact.job_title && (
								<p>
									<strong>{t("AdvancedFilters.fields.job_title")}:</strong>{" "}
									{contact.job_title.name}
								</p>
							)}
							{contact.industry && (
								<p>
									<strong>{t("AdvancedFilters.fields.industry")}:</strong>{" "}
									{contact.industry.name}
								</p>
							)}
							{contact.duration_role && (
								<p>
									<strong>{t("AdvancedFilters.fields.duration_role")}:</strong>{" "}
									{contact.duration_role} {t("common.years")}
								</p>
							)}
							{contact.connection_degree && (
								<p>
									<strong>
										{t("AdvancedFilters.fields.connection_degree")}:
									</strong>{" "}
									{contact.connection_degree}
								</p>
							)}
						</div>
					</div>

					{/* Only show the URLs section if at least one URL exists */}
					{hasUrls && (
						<div className="flex items-start space-x-3">
							<Globe className="mt-0.5 h-5 w-5 text-muted-foreground" />
							<div className="space-y-1">
								{contact.website_url && (
									<div className="group flex items-center space-x-2">
										<a
											href={contact.website_url}
											target="_blank"
											rel="noopener noreferrer"
											className="flex items-center text-primary hover:underline"
										>
											<ExternalLink className="mr-1 h-4 w-4" />
											{t("AdvancedFilters.fields.website")}
										</a>
										<button
											type="submit"
											onClick={() => copyToClipboard(contact.website_url!)}
											className="text-muted-foreground transition hover:text-primary"
										>
											{copiedUrl === contact.website_url ? (
												<Check className="h-4 w-4 text-green-500" />
											) : (
												<Copy className="h-4 w-4" />
											)}
										</button>
									</div>
								)}
								{contact.linkedin_url && (
									<div className="group flex items-center space-x-2">
										<a
											href={contact.linkedin_url}
											target="_blank"
											rel="noopener noreferrer"
											className="flex items-center text-primary hover:underline"
										>
											<Linkedin className="mr-1 h-4 w-4" />
											{t("AdvancedFilters.fields.linkedin")}
										</a>
										<button
											type="submit"
											onClick={() => copyToClipboard(contact.linkedin_url!)}
											className="text-muted-foreground transition hover:text-primary"
										>
											{copiedUrl === contact.linkedin_url ? (
												<Check className="h-4 w-4 text-green-500" />
											) : (
												<Copy className="h-4 w-4" />
											)}
										</button>
									</div>
								)}
								{contact.facebook_url && (
									<div className="group flex items-center space-x-2">
										<a
											href={contact.facebook_url}
											target="_blank"
											rel="noopener noreferrer"
											className="flex items-center text-primary hover:underline"
										>
											<Facebook className="mr-1 h-4 w-4" />{" "}
											{t("AdvancedFilters.fields.facebook")}
										</a>
										<button
											type="submit"
											onClick={() => copyToClipboard(contact.facebook_url!)}
											className="text-muted-foreground transition hover:text-primary"
										>
											{copiedUrl === contact.linkedin_url ? (
												<Check className="h-4 w-4 text-green-500" />
											) : (
												<Copy className="h-4 w-4" />
											)}
										</button>
									</div>
								)}
								{contact.twitter_url && (
									<div className="group flex items-center space-x-2">
										<a
											href={contact.twitter_url}
											target="_blank"
											rel="noopener noreferrer"
											className="flex items-center text-primary hover:underline"
										>
											<FaXTwitter className="mr-1 h-4 w-4" />{" "}
											{t("AdvancedFilters.fields.twitter")}
										</a>

										<button
											type="submit"
											onClick={() => copyToClipboard(contact.twitter_url!)}
											className="text-muted-foreground transition hover:text-primary"
										>
											{copiedUrl === contact.linkedin_url ? (
												<Check className="h-4 w-4 text-green-500" />
											) : (
												<Copy className="h-4 w-4" />
											)}
										</button>
									</div>
								)}
							</div>
						</div>
					)}

					{contact.job_description && (
						<div>
							<p className="mb-1 font-medium">
								{t("AdvancedFilters.fields.job_description")}:
							</p>
							<p className="text-muted-foreground text-sm">
								{contact.job_description}
							</p>
						</div>
					)}

					{contact.description && (
						<div>
							<p className="mb-1 font-medium">
								{t("AdvancedFilters.fields.description")}:
							</p>
							<p className="text-muted-foreground text-sm">
								{contact.description}
							</p>
						</div>
					)}

					{!contact.function &&
						!contact.organization &&
						!hasUrls &&
						!contact.description && (
							<p className="text-muted-foreground italic">
								{t("Contacts.details.professional.noInformation")}
							</p>
						)}
				</CardContent>
			</Card>

			<EditDialogProfessional
				contact={contact}
				isOpen={isEditing}
				onClose={() => setIsEditing(false)}
			/>
		</>
	);
}
