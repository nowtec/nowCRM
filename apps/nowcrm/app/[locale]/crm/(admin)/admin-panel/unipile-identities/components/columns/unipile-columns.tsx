"use client";
import type { UnipileIdentity } from "@nowcrm/services";
import type { ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import type React from "react";
import toast from "react-hot-toast";
import { FaRegTrashCan } from "react-icons/fa6";
import { MdOutlineRefresh } from "react-icons/md";
import { SortableHeader } from "@/components/dataTable/sortable-header";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddNewIdentityUnipile } from "@/lib/actions/healthCheck/refresh-unipile";
import { deleteUnipileIdentityAction } from "./delete-unipile";

const DeleteAction: React.FC<{ identity: UnipileIdentity }> = ({
	identity,
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
						const res = await deleteUnipileIdentityAction(identity.documentId);
						if (!res.success) {
							toast.error(res.errorMessage || "Failed to delete identity");
							return;
						}
						toast.success("Identity deleted");
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

const ReconnectAction: React.FC<{ identity: UnipileIdentity }> = ({
	identity,
}) => {
	const router = useRouter();

	const handleReconnect = async () => {
		try {
			const url = await AddNewIdentityUnipile(
				identity.name,
				identity.account_id,
			);
			if (url?.data) {
				router.push(url.data);
			} else {
				toast.error("Failed to get reconnection URL");
			}
		} catch (error) {
			toast.error("Error reconnecting identity");
			console.error(error);
		}
	};

	return (
		<Button
			variant="outline"
			size="sm"
			onClick={handleReconnect}
			className="flex items-center gap-1"
		>
			<MdOutlineRefresh className="h-4 w-4" />
			Reconnect
		</Button>
	);
};

export const columns: ColumnDef<UnipileIdentity>[] = [
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
		accessorKey: "unipile_status",
		header: ({ column }) => <SortableHeader column={column} label="Status" />,
	},
	{
		accessorKey: "account_id",
		header: "Account_id",
	},
	{
		id: "actions",
		header: "Actions",
		cell: ({ row }) => {
			const identity = row.original;
			const needsReconnect =
				identity.unipile_status !== "CREATION_SUCCESS" &&
				identity.unipile_status !== "RECONNECTED";

			return (
				<div className="flex items-center gap-2">
					{needsReconnect && <ReconnectAction identity={identity} />}
					<DeleteAction identity={identity} />
				</div>
			);
		},
	},
];
