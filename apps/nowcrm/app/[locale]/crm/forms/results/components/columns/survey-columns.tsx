"use client";

import type { DocumentId, Survey, SurveyItem } from "@nowcrm/services";
import type { ColumnDef, Row } from "@tanstack/react-table";
import { ChevronDown, ChevronRight, FileText } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FaRegTrashCan } from "react-icons/fa6";
import { SortableHeader } from "@/components/dataTable/sortable-header";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { getSurveyItemsBySurveyId } from "@/lib/actions/surveyItems/get-survey-items";
import { RouteConfig } from "@/lib/config/routes-config";
import { formatDateTimeStrapi } from "@/lib/strapi-date";
import { deleteSurveyAction } from "./delete-survey";

const DeleteAction: React.FC<{ survey: Survey }> = ({ survey }) => {
	const router = useRouter();
	return (
		<DropdownMenu>
			<DropdownMenuTrigger>
				<FaRegTrashCan className="h-4 w-4" />
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuItem
					onClick={async () => {
						const res = await deleteSurveyAction(survey.documentId);
						if (!res.success) {
							toast.error(res.errorMessage ?? "Failed to delete survey");
							return;
						}
						toast.success("Survey deleted");
						router.refresh();
					}}
				>
					Confirm
				</DropdownMenuItem>
				<DropdownMenuItem>Cancel</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};

export const columns: ColumnDef<Survey>[] = [
	{
		id: "select",
		header: ({ table }) => (
			<Checkbox
				checked={
					table.getIsAllPageRowsSelected() ||
					(table.getIsSomePageRowsSelected() && "indeterminate")
				}
				onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
				aria-label="Select all"
			/>
		),
		cell: ({ row }) => (
			<Checkbox
				checked={row.getIsSelected()}
				onCheckedChange={(value) => row.toggleSelected(!!value)}
				aria-label="Select row"
			/>
		),
		enableSorting: false,
		enableHiding: false,
	},
	{
		accessorKey: "name",
		header: ({ column }) => (
			<SortableHeader column={column} label="Completion" />
		),
		cell: ({ row }) => {
			const survey = row.original;
			return (
				<div className="flex items-center">
					<Button
						variant="ghost"
						size="sm"
						onClick={() => row.toggleExpanded()}
					>
						{row.getIsExpanded() ? (
							<>
								<ChevronDown className="h-4 w-4" />{" "}
								{survey.name || `Completion #${survey.id}`}
							</>
						) : (
							<>
								<ChevronRight className="h-4 w-4" />{" "}
								{survey.name || `Completion #${survey.id}`}
							</>
						)}
					</Button>
				</div>
			);
		},
	},
	{
		accessorKey: "id",
		header: ({ column }) => (
			<SortableHeader column={column} label="Survey Id" />
		),
		cell: ({ row }) => {
			return <div>{row.original.documentId}</div>;
		},
	},
	{
		accessorKey: "form_id",
		header: "Form ID",
		cell: ({ row }) => {
			return (
				<Link
					href={`${RouteConfig.forms.single(row.original.form_id)}`}
					className="font-medium"
				>
					{row.original.form_id}
				</Link>
			);
		},
	},
	{
		accessorKey: "createdAt",
		header: ({ column }) => (
			<SortableHeader column={column} label="Created At" />
		),
		cell: ({ row }) => {
			return <div>{formatDateTimeStrapi(row.original.createdAt)}</div>;
		},
	},
	{
		accessorKey: "updatedAt",
		header: ({ column }) => (
			<SortableHeader column={column} label="Updated At" />
		),
		cell: ({ row }) => {
			return <div>{formatDateTimeStrapi(row.original.updatedAt)}</div>;
		},
		meta: {
			hidden: true,
		},
	},
	{
		id: "actions",
		header: "Actions",
		cell: ({ row }) => {
			const _survey = row.original;
			return (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" className="h-8 w-8 p-0">
							<span className="sr-only">Open menu</span>
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuLabel>Actions</DropdownMenuLabel>
						<DropdownMenuSeparator />
					</DropdownMenuContent>
				</DropdownMenu>
			);
		},
	},
	{
		id: "delete",
		header: "Delete",
		cell: ({ row }) => {
			const survey = row.original;
			return <DeleteAction survey={survey} />;
		},
	},
];

// 👇 Subcomponent to display survey items
const SurveyItemsTable: React.FC<{ surveyId: DocumentId }> = ({ surveyId }) => {
	const [items, setItems] = useState<SurveyItem[] | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		async function load() {
			try {
				const data = await getSurveyItemsBySurveyId(surveyId);
				setItems(data.data);
			} catch (err) {
				console.error("Failed to fetch survey items", err);
			} finally {
				setLoading(false);
			}
		}

		load();
	}, [surveyId]);

	if (loading) {
		return (
			<div className="p-4 text-muted-foreground text-sm">
				Loading survey items...
			</div>
		);
	}

	if (!items || items.length === 0) {
		return (
			<div className="p-4 text-muted-foreground text-sm">
				No survey items found.
			</div>
		);
	}

	return (
		<div className="rounded-md border">
			<Table>
				<TableHeader className="border-b">
					<TableRow>
						<TableHead>Question</TableHead>
						<TableHead>Answer</TableHead>
						<TableHead>File</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{items.map((item) => (
						<TableRow key={item.id}>
							<TableCell>{item.question}</TableCell>
							<TableCell>{item.answer || "N/A"}</TableCell>
							<TableCell>
								{item.file?.url ? (
									<Link
										href={item.file.url}
										target="_blank"
										rel="noopener noreferrer"
									>
										<Button variant="outline" className="gap-2 text-sm">
											<FileText size={16} />
											{item.file.name && item.file.name.length > 24
												? `${item.file.name.slice(0, 24)}…`
												: item.file.name || "View File"}
										</Button>
									</Link>
								) : (
									<span className="text-muted-foreground text-sm">N/A</span>
								)}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
};

// 👇 Used in React Table's `renderSubComponent`
export const renderSubComponent = ({ row }: { row: Row<Survey> }) => {
	const survey = row.original;
	return <SurveyItemsTable surveyId={survey.documentId} />;
};
