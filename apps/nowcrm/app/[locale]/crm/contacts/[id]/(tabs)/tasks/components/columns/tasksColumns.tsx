"use client";
import type { ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { FaRegTrashCan } from "react-icons/fa6";
import { SortableHeader } from "@/components/dataTable/SortableHeader";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDateTimeStrapi } from "@/lib/strapiDate";
import { Task } from "@nowcrm/services";

const DeleteAction: React.FC<{ task: Task }> = ({ task }) => {
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
						const { deleteTaskAction } = await import("./deleteTask");
						const res = await deleteTaskAction(task.documentId);
						if(!res.success) {
							toast.error(res.errorMessage ?? "Failed to delete task");
							return;
						}
						toast.success(t("Contacts.tasks.taskDeleted"));
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

export const columns: ColumnDef<Task>[] = [
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
	},
	{
		accessorKey: "description",
		header: "Description",
	},
	{
		accessorKey: "action",
		header: ({ column }) => <SortableHeader column={column} label="Action" />,
	},
	{
		accessorKey: "assigned_to",
		header: "Assigned to",
		cell: ({ row }) => {
			return <div>{row.original.assigned_to?.username}</div>;
		},
	},
	{
		accessorKey: "due_date",
		header: ({ column }) => <SortableHeader column={column} label="Due Date" />,
		cell: ({ row }) => {
			return <div>{formatDateTimeStrapi(row.original.due_date)}</div>;
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
			const task = row.original;
			return <DeleteAction task={task} />;
		},
	},
];
