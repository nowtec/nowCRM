"use client";
import type { ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { useMessages } from "next-intl";
import type React from "react";
import { FaRegTrashCan } from "react-icons/fa6";
import { SortableHeader } from "@/components/dataTable/SortableHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDateTimeStrapi } from "@/lib/strapiDate";
import { Action } from "@nowcrm/services";


const DeleteAction: React.FC<{ action: Action }> = ({ action }) => {
	const router = useRouter();
	const t = useMessages();
	return (
		<DropdownMenu>
			<DropdownMenuTrigger>
				<FaRegTrashCan className="h-4 w-4" />
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuItem
					onClick={async () => {
						const { default: toast } = await import("react-hot-toast");
						const { deleteAction } = await import("./deleteAction");
						const res = await deleteAction(action.documentId);
						if(!res.success) {
							toast.error(res.errorMessage || "Failed to delete action");
							return;
						}
						toast.success(t.Contacts.toasts.actionsdeleted);
						router.refresh();
					}}
				>
					{t.common.actions.confirm}
				</DropdownMenuItem>
				<DropdownMenuItem>{t.common.actions.cancel}</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};

export const columns: ColumnDef<Action>[] = [
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
		accessorKey: "action_type",
		header: ({ column }) => <SortableHeader column={column} label="Type" />,
	},
	{
		accessorKey: "entity",
		header: ({ column }) => <SortableHeader column={column} label="Entity" />,
	},
	{
		accessorKey: "value",
		header: ({ column }) => <SortableHeader column={column} label="Value" />,
	},
	{
		accessorKey: "external_id",
		header: ({ column }) => (
			<SortableHeader column={column} label="External ID" />
		),
	},
	{
		accessorKey: "source",
		header: ({ column }) => <SortableHeader column={column} label="Source" />,
	},
	{
		accessorKey: "score_items",
		header: "Score items",
		cell: ({ row }) => {
			const score_items = row.original.score_items || [];
			return (
				<div className="flex flex-wrap gap-2">
					{score_items.map((score, index) => (
						<TooltipProvider key={`${score.documentId} - ${index}`}>
							<Card
								key={`${score.documentId} - ${index}`}
								className="w-fit cursor-help rounded-md border bg-muted shadow-none"
							>
								<Tooltip>
									<TooltipTrigger>
										<CardContent className="px-3 py-1 text-sm ">
											<div>{score.name}</div>
											<TooltipContent>
												<p>{score.value}</p>
											</TooltipContent>
										</CardContent>
									</TooltipTrigger>
								</Tooltip>
							</Card>
						</TooltipProvider>
					))}
				</div>
			);
		},
	},
	{
		accessorKey: "journey_step",
		header: "Journey step",
		cell: ({ row }) => {
			const journey_step = row.original.journey_step || [];
			return <div>{journey_step.name}</div>;
		},
	},
	{
		accessorKey: "effort",
		header: ({ column }) => <SortableHeader column={column} label="Effort" />,
	},
	{
		accessorKey: "partnership",
		header: ({ column }) => (
			<SortableHeader column={column} label="Partnership" />
		),
	},
	{
		accessorKey: "payload",
		header: "Payload",
		meta: {
			hidden: true,
		},
	},
	{
		id: "delete",
		cell: ({ row }) => {
			const action = row.original;
			return <DeleteAction action={action} />;
		},
	},
];
