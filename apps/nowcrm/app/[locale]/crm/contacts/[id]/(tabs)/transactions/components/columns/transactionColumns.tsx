"use client";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import React from "react";
import { FaRegTrashCan } from "react-icons/fa6";
import { SortableHeader } from "@/components/dataTable/SortableHeader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,	
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDateTimeStrapi } from "@/lib/strapiDate";
import { DonationTransaction } from "@nowcrm/services";
import EditTransactionDialog from "./editTransactionDialog";

const DeleteAction: React.FC<{ transaction: DonationTransaction }> = ({
	transaction,
}) => {
	const t = useTranslations();
	const router = useRouter();
	return (
		<DropdownMenu>
			<DropdownMenuTrigger>
				<FaRegTrashCan className="h-4 w-4" />
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuItem
					onClick={async () => {
						const { default: toast } = await import("react-hot-toast");
						const { deleteTransactionAction } = await import(
							"./deleteTransaction"
						);
						const res = await deleteTransactionAction(transaction.documentId);
						if(!res.success) {
							toast.error(res.errorMessage ?? "Failed to delete transaction");
							return;
						}
						toast.success(t("Contacts.transactions.transactionDeleted"));
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

const ViewActions: React.FC<{ transaction: DonationTransaction }> = ({
	transaction,
}) => {
	const t = useTranslations();
	const [dialogOpen, setDialogOpen] = React.useState(false);
	return (
		<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="ghost" className="h-8 w-8 p-0">
						<span className="sr-only">Open menu</span>
						<MoreHorizontal className="h-4 w-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuLabel>{t("common.actions.actions")}</DropdownMenuLabel>
					<DialogTrigger asChild>
						<DropdownMenuItem>{t("common.actions.edit")}</DropdownMenuItem>
					</DialogTrigger>
					<DropdownMenuSeparator />
				</DropdownMenuContent>
			</DropdownMenu>

			<EditTransactionDialog
				transaction={transaction}
				setDialogOpen={setDialogOpen}
			/>
		</Dialog>
	);
};

export const columns: ColumnDef<DonationTransaction>[] = [
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
		accessorKey: "card_holder_name",
		header: "Card holder name",
	},
	{
		accessorKey: "amount",
		header: ({ column }) => <SortableHeader column={column} label="Amount" />,
	},
	{
		accessorKey: "currency",
		header: ({ column }) => <SortableHeader column={column} label="Currency" />,
	},
	{
		accessorKey: "payment_method",
		header: ({ column }) => (
			<SortableHeader column={column} label="Payment method" />
		),
	},
	{
		accessorKey: "payment_provider",
		header: "Payment provider",
	},
	{
		accessorKey: "status",
		header: "Status",
	},
	{
		accessorKey: "epp_transaction_id",
		header: "EPP transcation id",
	},
	{
		accessorKey: "user_ip",
		header: "User ip",
	},
	{
		accessorKey: "user_agent",
		header: "User agent",
	},
	{
		accessorKey: "campaign_id",
		header: "Campaign id",
		meta: {
			hidden: true,
		},
	},
	{
		accessorKey: "campaign_name",
		header: "Campaign name",
		meta: {
			hidden: true,
		},
	},
	{
		accessorKey: "purpose",
		header: "Purpose",
		meta: {
			hidden: true,
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
		id: "actions",
		cell: ({ row }) => {
			const transaction = row.original;

			return <ViewActions transaction={transaction} />;
		},
	},

	{
		id: "delete",
		cell: ({ row }) => {
			const transaction = row.original;
			return <DeleteAction transaction={transaction} />;
		},
	},
];
