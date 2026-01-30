"use client";
import type { Campaign } from "@nowcrm/services";
import type { ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { useMessages } from "next-intl";
import { FaRegTrashCan } from "react-icons/fa6";
import { SortableHeader } from "@/components/dataTable/sortable-header";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import EditCampaignDialog from "./edit-dialog";

const DeleteAction: React.FC<{ campaign: Campaign }> = ({ campaign }) => {
	const t = useMessages();

	const router = useRouter();
	return (
		<DropdownMenu>
			<DropdownMenuTrigger>
				<FaRegTrashCan className="h-4 w-4 cursor-pointer" />
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuItem
					className="cursor-pointer"
					onClick={async () => {
						const { default: toast } = await import("react-hot-toast");
						const { deleteCampaignAction } = await import("./delete-campaign");
						const res = await deleteCampaignAction(campaign.documentId);
						if (!res.success) {
							toast.error(res.errorMessage ?? "Failed to delete campaign");
							return;
						}
						toast.success(t.common.actions.delete);
						router.refresh();
					}}
				>
					{t.common.actions.confirm}
				</DropdownMenuItem>
				<DropdownMenuItem className="cursor-pointer">
					{t.common.actions.cancel}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};

export const columns: ColumnDef<Campaign>[] = [
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
		header: ({ column }) => (
			<SortableHeader column={column} label="Description" />
		),
	},
	{
		accessorKey: "campaign_category.name",
		header: ({ column }) => <SortableHeader column={column} label="Category" />,
	},
	{
		id: "edit",
		header: "Edit",
		cell: ({ row }) => {
			const campaign = row.original;
			return <EditCampaignDialog campaign={campaign} />;
		},
	},
	{
		id: "delete",
		header: "Delete",
		cell: ({ row }) => {
			const campaign = row.original;
			return <DeleteAction campaign={campaign} />;
		},
	},
];
