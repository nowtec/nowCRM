"use client";

import type { ColumnDef, Row } from "@tanstack/react-table";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { FaRegTrashCan } from "react-icons/fa6";
import { SortableHeader } from "@/components/dataTable/SortableHeader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
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
import { formatDateTimeStrapi } from "@/lib/strapiDate";
import { DocumentId, Survey, SurveyItem } from "@nowcrm/services";

const DeleteAction: React.FC<{ survey: Survey }> = ({ survey }) => {
	const router = useRouter();
	const t = useTranslations();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger>
				<FaRegTrashCan className="h-4 w-4" />
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuItem
					onClick={async () => {
						const { default: toast } = await import("react-hot-toast");
						const { deleteSurveyAction } = await import("./deleteSurvey");
						const res =await deleteSurveyAction(survey.documentId);
						if(!res.success) {
							toast.error(res.errorMessage ?? "Failed to delete survey");
							return;
						}
						toast.success(t("Contacts.surveys.surveyDeleted"));
						router.refresh();
					}}
				>
					{t("common.actions.confirm")}
				</DropdownMenuItem>
				<DropdownMenuItem>{t("common.actions.cancel")}</DropdownMenuItem>
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
		header: ({ column }) => <SortableHeader column={column} label="Name" />,
		cell: ({ row }) => {
			const project = row.original;
			return (
				<div className="flex items-center">
					<Button
						variant="ghost"
						size="sm"
						onClick={() => row.toggleExpanded()}
					>
						{row.getIsExpanded() ? (
							<>
								<ChevronDown className="h-4 w-4" /> {project.name}
							</>
						) : (
							<>
								<ChevronRight className="h-4 w-4" /> {project.name}
							</>
						)}
					</Button>
				</div>
			);
		},
	},
	{
		accessorKey: "form_id",
		header: "Form id",
	},
	{
		accessorKey: "createdAt",
		header: ({ column }) => (
			<SortableHeader column={column} label="Created At" />
		),
		cell: ({ row }) => {
			return <div>{formatDateTimeStrapi(row.original.createdAt)}</div>;
		},
		meta: {
			hidden: true,
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
		id: "delete",
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
						<TableHead>Video Ask Option ID</TableHead>
						<TableHead>Video Ask Question ID</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{items.map((item) => (
						<TableRow key={item.id}>
							<TableCell>{item.question}</TableCell>
							<TableCell>{item.answer || "N/A"}</TableCell>
							<TableCell>
								{item.file?.url ? (
									<div className="flex flex-col gap-1">
										{item.file.name && (
											<div className="font-medium text-sm">
												{item.file.name}
											</div>
										)}
										<div className="flex gap-2">
											<a
												href={item.file.url}
												target="_blank"
												rel="noopener noreferrer"
											>
												<Button variant="link" size="sm">
													View
												</Button>
											</a>
											<a href={item.file.url} download>
												<Button variant="link" size="sm">
													Download
												</Button>
											</a>
										</div>
									</div>
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
