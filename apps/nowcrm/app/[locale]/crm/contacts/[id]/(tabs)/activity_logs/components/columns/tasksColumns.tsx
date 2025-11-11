"use client";
import type { ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { useMessages } from "next-intl";
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
import { ActivityLog } from "@nowcrm/services";

const DeleteAction: React.FC<{ activityLog: ActivityLog }> = ({
	activityLog,
}) => {
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
						const { deleteActivityLogAction } = await import(
							"./deleteActivityLogs"
						);
						await deleteActivityLogAction(activityLog.documentId);
						toast.success(t.Contacts.activityLog.activityDeleted);
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

export const columns: ColumnDef<ActivityLog>[] = [
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
		accessorKey: "action",
		header: ({ column }) => <SortableHeader column={column} label="Action" />,
	},
	{
		accessorKey: "description",
		header: "Description",
	},
	{
		accessorKey: "user",
		header: "User",
		cell: ({ row }) => {
			const username = row.original.user?.username;
			console.log(row.original);
			return <div>{username}</div>;
		},
		meta: {
			hidden: true,
		},
	},
	{
		id: "delete",
		cell: ({ row }) => {
			const activityLog = row.original;
			return <DeleteAction activityLog={activityLog} />;
		},
	},
];
