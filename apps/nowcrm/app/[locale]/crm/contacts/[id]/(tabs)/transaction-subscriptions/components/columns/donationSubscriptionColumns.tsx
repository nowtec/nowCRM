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
import { DonationSubscription } from "@nowcrm/services";
import EditSubscriptionTransactionDialog from "./editSubscriptionDialog";

const DeleteAction: React.FC<{ subscription: DonationSubscription }> = ({
	subscription,
}) => {
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
						const { deleteDonationSubscriptionAction } = await import(
							"./deleteTransaction"
						);
						const res = await deleteDonationSubscriptionAction(subscription.documentId);
						if(!res.success) {
							toast.error(res.errorMessage ?? "Failed to delete donation subscription");
							return;
						}
						toast.success(
							t(
								"Contacts.transactionSubscription.transactionSubscriptionDeleted",
							),
						);
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

const ViewActions: React.FC<{ subscription: DonationSubscription }> = ({
	subscription,
}) => {
	const [dialogOpen, setDialogOpen] = React.useState(false);
	const t = useTranslations();
	return (
		<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="ghost" className="h-8 w-8 p-0">
						<span className="sr-only">{t("common.actions.openMenu")}</span>
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
			<EditSubscriptionTransactionDialog
				subscription={subscription}
				setDialogOpen={setDialogOpen}
			/>
		</Dialog>
	);
};

export const columns: ColumnDef<DonationSubscription>[] = [
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
		accessorKey: "payment_method",
		header: ({ column }) => (
			<SortableHeader column={column} label="Payment method" />
		),
	},
	{
		accessorKey: "payment_provider",
		header: ({ column }) => (
			<SortableHeader column={column} label="Payment provider" />
		),
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
		accessorKey: "interval",
		header: "Interval",
	},
	{
		accessorKey: "subscription_token",
		header: "Subscription token",
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
			const subscription = row.original;

			return <ViewActions subscription={subscription} />;
		},
	},

	{
		id: "delete",
		cell: ({ row }) => {
			const subscription = row.original;
			return <DeleteAction subscription={subscription} />;
		},
	},
];
