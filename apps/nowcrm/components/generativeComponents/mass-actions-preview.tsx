"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import DataTable from "../dataTable/data-table";
import { columns } from "./columns";

interface MassActionPreviewProps {
	onClose: () => void;
	onApprove: () => void;
	actionType:
		| "delete"
		| "add_to_list"
		| "update_subscription"
		| "update_field"
		| "add_to_journey"
		| "export"
		| "anonymize"
		| "add_to_organization"
		| "send";
	previewData: any[];
	totalCount?: number;
	isLoading?: boolean;
	selectedOption?: any; // For actions that need additional context
}

export default function MassActionPreview({
	onClose,
	onApprove,
	actionType,
	previewData = [],
	totalCount = 0,
	isLoading = false,
	selectedOption,
}: MassActionPreviewProps) {
	// Get action-specific content
	const getActionContent = () => {
		switch (actionType) {
			case "delete":
				return {
					title: "Delete Contacts",
					description: `You are about to delete ${totalCount} contacts that match your filters. This action cannot be undone.`,
					buttonText: "Approve Delete",
					variant: "destructive" as const,
				};
			case "add_to_list":
				return {
					title: "Add Contacts to List",
					description: `You are about to add ${totalCount} contacts to the selected list${selectedOption?.label ? ` "${selectedOption.label}"` : ""}.`,
					buttonText: "Approve Add to List",
					variant: "default" as const,
				};
			case "update_subscription":
				return {
					title: "Update subscription to contacts",
					description: `You are about to update subscription ${totalCount} contacts from${selectedOption?.label ? ` "${selectedOption.label}"` : ""}.`,
					buttonText: "Approve subscription",
					variant: "default" as const,
				};
			case "update_field":
				return {
					title: "Update Contacts",
					description: `You are about to update ${totalCount} contacts that match your filters with the specified changes.`,
					buttonText: "Approve Update",
					variant: "default" as const,
				};
			case "add_to_journey":
				return {
					title: "Add Contacts to Journey",
					description: `You are about to add ${totalCount} contacts to the selected journey${selectedOption?.label ? ` "${selectedOption.label}"` : ""}.`,
					buttonText: "Approve Add to Journey",
					variant: "default" as const,
				};
			case "export":
				return {
					title: "Export Contacts",
					description: `You are about to export ${totalCount} contacts that match your filters.`,
					buttonText: "Approve Export",
					variant: "default" as const,
				};
			case "anonymize":
				return {
					title: "Anonymize Contacts",
					description: `You are about to anonymize ${totalCount} contacts that match your filters. This will remove all personal information and cannot be undone.`,
					buttonText: "Approve Anonymize",
					variant: "destructive" as const,
				};
			case "add_to_organization":
				return {
					title: "Add Contacts to Organization",
					description: `You are about to add ${totalCount} contacts to the selected organization${selectedOption?.label ? ` "${selectedOption.label}"` : ""}.`,
					buttonText: "Approve Add to Organization",
					variant: "default" as const,
				};
			case "send":
				return {
					title: "Send Composition to Contacts",
					description: `You are about to send the selected composition${selectedOption?.label ? ` "${selectedOption.label}"` : ""} to ${totalCount} contacts.`,
					buttonText: "Approve Send Composition",
					variant: "default" as const,
				};
			default:
				return {
					title: "Mass Action",
					description: `You are about to perform an action on ${totalCount} contacts.`,
					buttonText: "Approve Action",
					variant: "default" as const,
				};
		}
	};

	const { buttonText, variant } = getActionContent();

	// Check if action is destructive (cannot be undone)
	const isDestructiveAction =
		actionType === "delete" || actionType === "anonymize";

	return (
		<>
			<div className="max-h-[300px] overflow-auto">
				{isLoading ? (
					<div className="space-y-3">
						<Skeleton className="h-8 w-full" />
						<div className="grid grid-cols-4 gap-4">
							{Array(5)
								.fill(0)
								.map((_, index) => (
									<Skeleton key={index} className="h-8 w-full" />
								))}
						</div>
						{Array(5)
							.fill(0)
							.map((_, index) => (
								<div key={index} className="grid grid-cols-4 gap-4">
									{Array(4)
										.fill(0)
										.map((_, cellIndex) => (
											<Skeleton key={cellIndex} className="h-8 w-full" />
										))}
								</div>
							))}
					</div>
				) : previewData.length > 0 ? (
					<DataTable
						columns={columns}
						data={previewData}
						table_name="Preview Table"
						table_title="Contacts Preview"
						hiddenCollumnIds={[]}
						mass_actions={() => <></>}
						pagination={{
							page: 1,
							pageSize: previewData.length,
							pageCount: 1,
							total: previewData.length,
						}}
						hiddenSearch={true}
						hiddenCreate={true}
						showStatusModal={false}
					/>
				) : (
					<div className="flex h-32 items-center justify-center text-muted-foreground">
						No contacts match your filters
					</div>
				)}
			</div>

			{/* Warning for destructive actions */}
			{isDestructiveAction && !isLoading && previewData.length > 0 && (
				<div className="rounded-md border border-destructive/20 bg-destructive/10 p-3">
					<p className="font-medium text-destructive text-sm">
						⚠️ Warning: This action cannot be undone!
					</p>
					<p className="mt-1 text-destructive/80 text-sm">
						{actionType === "delete"
							? "All selected contacts will be permanently deleted from your database."
							: "All personal information will be permanently removed from the selected contacts."}
					</p>
				</div>
			)}
			<div className="mt-4 flex justify-end gap-2">
				<Button variant="outline" onClick={onClose}>
					Cancel
				</Button>
				<Button
					onClick={onApprove}
					variant={variant}
					disabled={isLoading || previewData.length === 0}
					className={
						isDestructiveAction ? "bg-destructive hover:bg-destructive/90" : ""
					}
				>
					{isLoading ? "Processing..." : buttonText}
				</Button>
			</div>
		</>
	);
}
