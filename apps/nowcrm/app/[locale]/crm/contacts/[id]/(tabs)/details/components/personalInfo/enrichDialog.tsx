"use client";

import { Check, Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { findData } from "@/components/autoComplete/findData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Contact } from "@nowcrm/services";

interface EnrichDialogProps {
	contact: Contact;
	isOpen: boolean;
	onClose: () => void;
}

interface EnrichableField {
	key: string;
	label: string;
	description: string;
	category: "personal" | "professional" | "contact" | "social";
	currentValue?: string;
}

interface EnrichmentResult {
	[key: string]: {
		original: string;
		enriched: string;
		confidence: number;
	};
}

export function EnrichDialog({ contact, isOpen, onClose }: EnrichDialogProps) {
	const router = useRouter();
	const [selectedFields, setSelectedFields] = useState<string[]>([]);
	const [isEnriching, setIsEnriching] = useState(false);
	const [enrichmentResults, setEnrichmentResults] =
		useState<EnrichmentResult | null>(null);
	const [isApplying, setIsApplying] = useState(false);
	const [selectedModel, setSelectedModel] = useState("gpt-4o-mini");

	const enrichableFields: EnrichableField[] = [
		{
			key: "title",
			label: "Title",
			description: "Professional title (Mr, Mrs, Ms, Dr, Prof)",
			category: "personal",
			currentValue: contact.title?.name,
		},
		{
			key: "salutation",
			label: "Salutation",
			description:
				"Professional title (Dear Mr, Dear Mrs, Dear Ms, Dear Dr, Dear Prof, Dear Sir, Dear Madam, Dear)",
			category: "personal",
			currentValue: contact.salutation?.name,
		},
		{
			key: "gender",
			label: "Gender",
			description: "Gender identification",
			category: "personal",
			currentValue: contact.gender,
		},
		{
			key: "function",
			label: "Job Title/Function",
			description: "Professional role and position",
			category: "professional",
			currentValue: contact.function,
		},
		{
			key: "industry",
			label: "Industry",
			description: "Industry sector",
			category: "professional",
			currentValue: contact.industry?.name,
		},
		{
			key: "location",
			label: "Location",
			description: "City and geographic location",
			category: "contact",
			currentValue: contact.location,
		},
		{
			key: "country",
			label: "Country",
			description: "Country of residence/business",
			category: "contact",
			currentValue: contact.country,
		},
		{
			key: "website_url",
			label: "Website",
			description: "Personal or professional website",
			category: "social",
			currentValue: contact.website_url,
		},
		{
			key: "linkedin_url",
			label: "LinkedIn Profile",
			description: "LinkedIn profile URL",
			category: "social",
			currentValue: contact.linkedin_url,
		},
		{
			key: "facebook_url",
			label: "Facebook Profile",
			description: "Facebook profile URL",
			category: "social",
			currentValue: contact.facebook_url,
		},
		{
			key: "twitter_url",
			label: "Twitter Profile",
			description: "Twitter/X profile URL",
			category: "social",
			currentValue: contact.twitter_url,
		},
		{
			key: "description",
			label: "Professional Summary",
			description: "Brief professional description",
			category: "professional",
			currentValue: contact.description,
		},
	];

	const handleFieldToggle = (fieldKey: string) => {
		setSelectedFields((prev) =>
			prev.includes(fieldKey)
				? prev.filter((key) => key !== fieldKey)
				: [...prev, fieldKey],
		);
	};

	const handleSelectAll = (category?: string) => {
		const fieldsToSelect = category
			? enrichableFields
					.filter((field) => field.category === category)
					.map((field) => field.key)
			: enrichableFields.map((field) => field.key);

		setSelectedFields((prev) => {
			const newSelection = [...new Set([...prev, ...fieldsToSelect])];
			return newSelection;
		});
	};

	const handleDeselectAll = () => {
		setSelectedFields([]);
	};

	const handleEnrich = async () => {
		if (selectedFields.length === 0) return;

		const { default: toast } = await import("react-hot-toast");
		const { structuredResponse } = await import(
			"@/lib/actions/composer/get-sctructured-response"
		);

		try {
			setIsEnriching(true);

			// Prepare only the selected fields data as key:value pairs
			const selectedFieldsData = selectedFields.reduce(
				(acc, fieldKey) => {
					const field = enrichableFields.find((f) => f.key === fieldKey);
					if (field) {
						acc[fieldKey] = field.currentValue || "";
					}
					return acc;
				},
				{} as Record<string, string>,
			);

			// Get Titles/Salutations
			const titles = await findData("contactTitlesService");
			const salutations = await findData("contactSalutationsService");

			// Add essential context data
			const inputData = {
				first_name: contact.first_name,
				last_name: contact.last_name,
				email: contact.email,
				organization: contact.organization?.name,
				...selectedFieldsData,
			};

			// Structure scheme matching the Contact interface
			const contactStructureScheme = {
				email: "string",
				first_name: "string",
				last_name: "string",
				address_line1: "string",
				address_line2: "string",
				plz: "string",
				zip: "number",
				location: "string",
				canton: "string",
				country: "string",
				language: "string",
				function: "string",
				phone: "string",
				mobile_phone: "string",
				salutation: `enum: ${JSON.stringify(salutations)}`,
				title: `enum: ${JSON.stringify(titles)}`,
				gender: "string",
				website_url: "string",
				linkedin_url: "string",
				facebook_url: "string",
				twitter_url: "string",
				birth_date: "Date",
				industry: "string",
				description: "string",
				status:
					"string (new|closed|contacted|negotiating|registered|backfill|prospect/marketing|customer/no marketing)",
				priority: "string (p1|p2|p3|p4|p5)",
			};

			const enrichmentRequest = {
				model: selectedModel,
				input_data: JSON.stringify(inputData),
				structure_scheme: JSON.stringify(contactStructureScheme),
				language: contact.language || "en",
			};

			const result = await structuredResponse(enrichmentRequest);

			console.log("[Enrich component] collected result:");
			console.log(result);

			if (result.success && result.data) {
				const enrichedData = result.data.result;

				// Transform the results into our expected format
				const transformedResults: EnrichmentResult = {};
				selectedFields.forEach((fieldKey) => {
					const field = enrichableFields.find((f) => f.key === fieldKey);
					const enrichedValue = enrichedData[fieldKey];

					if (field && enrichedValue) {
						transformedResults[fieldKey] = {
							original: field.currentValue || "",
							enriched: enrichedValue || "",
							confidence: 0.8, // Since backend handles confidence, using default
						};
					}
				});

				setEnrichmentResults(transformedResults);
				toast.success("Enrichment completed! Review the suggestions below.");
			} else {
				toast.error("Failed to enrich contact data. Please try again.");
			}
		} catch (error) {
			console.error("Error enriching contact:", error);
			toast.error("An error occurred while enriching the contact.");
		} finally {
			setIsEnriching(false);
		}
	};

	const handleApplyEnrichment = async () => {
		if (!enrichmentResults) return;

		const { default: toast } = await import("react-hot-toast");
		const { updateContact } = await import(
			"@/lib/actions/contacts/update-contact"
		);

		try {
			setIsApplying(true);

			const updateData: Record<string, any> = {};

			for (const [fieldKey, result] of Object.entries(enrichmentResults)) {
				if (result.enriched && result.enriched !== result.original) {
					const valueToApply: any = result.enriched;

					// Handle special fields that require IDs instead of raw strings
					if (fieldKey === "title") {
						const response = await findData("contactTitlesService", {
							filters: { name: { $eq: result.enriched } },
						});
						const match = response?.data?.[0];
						if (match?.id) {
							updateData.title = match.id;
						} else {
							console.warn(`No match found for title: ${result.enriched}`);
						}
						continue;
					}

					if (fieldKey === "salutation") {
						const response = await findData("contactSalutationsService", {
							filters: { name: { $eq: result.enriched } },
						});
						const match = response?.data?.[0];
						if (match?.id) {
							updateData.salutation = match.id;
						} else {
							console.warn(`No match found for salutation: ${result.enriched}`);
						}
						continue;
					}

					// Default behavior
					updateData[fieldKey] = valueToApply;
				}
			}

			if (Object.keys(updateData).length === 0) {
				toast.error("No changes to apply.");
				return;
			}
			const result = await updateContact(contact.documentId, updateData);

			if (result.success) {
				toast.success("Contact enriched successfully!");
				router.refresh();
				onClose();
			} else {
				toast.error(`Failed to update contact: ${result.errorMessage}`);
			}
		} catch (error) {
			console.error("Error applying enrichment:", error);
			toast.error("An error occurred while updating the contact.");
		} finally {
			setIsApplying(false);
		}
	};

	const handleReset = () => {
		setSelectedFields([]);
		setEnrichmentResults(null);
		setSelectedModel("gpt-4o-mini");
	};

	const groupedFields = enrichableFields.reduce(
		(acc, field) => {
			if (!acc[field.category]) {
				acc[field.category] = [];
			}
			acc[field.category].push(field);
			return acc;
		},
		{} as Record<string, EnrichableField[]>,
	);

	const categoryLabels = {
		personal: "Personal Information",
		professional: "Professional Details",
		contact: "Contact Information",
		social: "Social Media Profiles",
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-[600px]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Sparkles className="h-5 w-5 text-primary" />
						Enrich Contact with AI
					</DialogTitle>
					<DialogDescription>
						Please note that the data of this contact may be shared with
						third-party providers such as OpenAI, Anthropic, Inc., and others in
						order to generate enriched suggestions using AI.
						<br />
						<br />
						Select the fields you'd like to enrich for{" "}
						<strong>
							{contact.first_name} {contact.last_name}
						</strong>{" "}
						below. The AI will provide professional, context-aware suggestions
						based on the existing information.
					</DialogDescription>
				</DialogHeader>
				{!enrichmentResults ? (
					<div className="space-y-6">
						<div className="space-y-2">
							<Label className="font-medium text-sm">AI Model</Label>
							<Select value={selectedModel} onValueChange={setSelectedModel}>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Select AI model" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
									<SelectItem value="claude">Claude</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="flex gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => handleSelectAll()}
							>
								Select All
							</Button>
							<Button variant="outline" size="sm" onClick={handleDeselectAll}>
								Deselect All
							</Button>
						</div>

						{Object.entries(groupedFields).map(([category, fields]) => (
							<div key={category} className="space-y-3">
								<div className="flex items-center justify-between">
									<h4 className="font-medium text-sm">
										{categoryLabels[category as keyof typeof categoryLabels]}
									</h4>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => handleSelectAll(category)}
										className="text-xs"
									>
										Select Category
									</Button>
								</div>
								<div className="grid gap-3">
									{fields.map((field) => (
										<div
											key={field.key}
											className="flex items-start space-x-3 rounded-lg border p-3"
										>
											<Checkbox
												id={field.key}
												checked={selectedFields.includes(field.key)}
												onCheckedChange={() => handleFieldToggle(field.key)}
											/>
											<div className="flex-1 space-y-1">
												<Label
													htmlFor={field.key}
													className="cursor-pointer font-medium"
												>
													{field.label}
												</Label>
												<p className="text-muted-foreground text-xs">
													{field.description}
												</p>
												{field.currentValue && (
													<Badge variant="secondary" className="text-xs">
														Current: {field.currentValue}
													</Badge>
												)}
											</div>
										</div>
									))}
								</div>
								<Separator />
							</div>
						))}
					</div>
				) : (
					<div className="space-y-4">
						<h4 className="font-medium">Enrichment Results</h4>
						{Object.entries(enrichmentResults).map(([fieldKey, result]) => {
							const field = enrichableFields.find((f) => f.key === fieldKey);
							if (!field) return null;

							return (
								<div key={fieldKey} className="space-y-2 rounded-lg border p-4">
									<div className="flex items-center justify-between">
										<h5 className="font-medium">{field.label}</h5>
									</div>
									<div className="grid gap-2 text-sm">
										<div>
											<span className="text-muted-foreground">Original: </span>
											<span>{result.original || "Empty"}</span>
										</div>
										<div>
											<span className="text-muted-foreground">Suggested: </span>
											<span className="font-medium">{result.enriched}</span>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				)}

				<DialogFooter className="flex gap-2">
					{!enrichmentResults ? (
						<>
							<Button variant="outline" onClick={onClose}>
								Cancel
							</Button>
							<Button
								onClick={handleEnrich}
								disabled={selectedFields.length === 0 || isEnriching}
							>
								{isEnriching ? (
									<>
										<span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
										Enriching...
									</>
								) : (
									<>
										<Sparkles className="mr-2 h-4 w-4" />
										Enrich Selected Fields ({selectedFields.length})
									</>
								)}
							</Button>
						</>
					) : (
						<>
							<Button variant="outline" onClick={handleReset}>
								<X className="mr-2 h-4 w-4" />
								Start Over
							</Button>
							<Button onClick={handleApplyEnrichment} disabled={isApplying}>
								{isApplying ? (
									<>
										<span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
										Applying...
									</>
								) : (
									<>
										<Check className="mr-2 h-4 w-4" />
										Apply Enrichment
									</>
								)}
							</Button>
						</>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
