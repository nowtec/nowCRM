"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { FileText, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { FaRegTrashCan } from "react-icons/fa6";
import { SortableHeader } from "@/components/dataTable/SortableHeader";
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
import { RouteConfig } from "@/lib/config/RoutesConfig";
import { formatDateTimeStrapi } from "@/lib/strapiDate";
import { deleteSurveyItemAction } from "./deleteSurveyItem";
import { SurveyItem } from "@nowcrm/services";

const DeleteAction: React.FC<{ surveryItem: SurveyItem }> = ({
	surveryItem,
}) => {
	const router = useRouter();
	return (
		<DropdownMenu>
			<DropdownMenuTrigger>
				<FaRegTrashCan className="h-4 w-4" />
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuItem
					onClick={async () => {
						const res = await deleteSurveyItemAction(surveryItem.documentId);
						if (!res.success) {
							toast.error(res.errorMessage ?? "Failed to delete survey item");
							return;
						}
						toast.success("Survey Item deleted");
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

const ViewActions: React.FC<{ surveyItem: SurveyItem }> = () => {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" className="h-8 w-8 p-0">
					<span className="sr-only">Open menu</span>
					<MoreHorizontal className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuLabel>Actions</DropdownMenuLabel>
				{/* <Link href={`${RouteConfig.lists.single(surveyItem.id)}`}>
					<DropdownMenuItem>View Item</DropdownMenuItem>
				</Link> */}
				<DropdownMenuSeparator />
			</DropdownMenuContent>
		</DropdownMenu>
	);
};

export const columns: ColumnDef<SurveyItem>[] = [
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
		accessorKey: "id",
		header: ({ column }) => (
			<SortableHeader column={column} label="Survey Item ID" />
		),
		cell: ({ row }) => {
			return <div>{row.original.id}</div>;
		},
	},
	{
		accessorKey: "question",
		header: ({ column }) => <SortableHeader column={column} label="Question" />,
		cell: ({ row }) => {
			return <div>{row.original.question}</div>;
		},
	},
	{
		accessorKey: "answer",
		header: ({ column }) => <SortableHeader column={column} label="Answer" />,
		cell: ({ row }) => {
			return <div>{row.original.answer}</div>;
		},
	},
	{
		accessorKey: "survey.form_id",
		header: "Survey Form ID",
		cell: ({ row }) => {
			return (
				<Link
					href={`${RouteConfig.forms.single(row.original.survey.form_id)}`}
					className=" font-medium"
				>
					{row.original.survey.form_id}
				</Link>
			);
		},
	},
	{
		accessorKey: "file.url",
		header: "File",
		cell: ({ row }) => {
			const file = row.original.file;
			if (!file?.url || !file?.name) return null;

			const trimmedName =
				file.name.length > 24 ? `${file.name.slice(0, 24)}…` : file.name;

			return (
				<Link href={file.url} target="_blank" rel="noopener noreferrer">
					<Button variant="outline" className="gap-2 text-sm">
						<FileText size={16} />
						{trimmedName}
					</Button>
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
	},
	{
		id: "actions",
		header: "Actions",
		cell: ({ row }) => {
			const surveyItem = row.original;

			return <ViewActions surveyItem={surveyItem} />;
		},
	},
	{
		id: "delete",
		header: "Delete",
		cell: ({ row }) => {
			const surveyItem = row.original;
			return <DeleteAction surveryItem={surveyItem} />;
		},
	},
];
