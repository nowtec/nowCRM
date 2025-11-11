"use client";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { FaRegTrashCan } from "react-icons/fa6";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { updateSubscription } from "@/lib/actions/subscriptions/update-subscription";
import { RouteConfig } from "@/lib/config/RoutesConfig";
import { formatDateTimeStrapi } from "@/lib/strapiDate";
import { Subscription } from "@nowcrm/services";

const DeleteAction: React.FC<{ subscription: Subscription }> = ({
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
						const { deleteSubscriptionAction } = await import(
							"./deleteSubscription"
						);
						const res = await deleteSubscriptionAction(subscription.documentId);
						if(!res.success) {
							toast.error(res.errorMessage || "Failed to delete subscription");
							return;
						}
						toast.success(t("Contacts.subscriptions.subscriptionDeleted"));
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

const SwitchAction: React.FC<{ subscription: Subscription }> = ({
	subscription,
}) => {
	const router = useRouter();
	const t = useTranslations();
	return (
		<Switch
			checked={!!subscription.active}
			onCheckedChange={async (value) => {
				const { default: toast } = await import("react-hot-toast");
				const res = await updateSubscription(subscription.documentId, { active: value });
				if(!res.success) {
					toast.error(res.errorMessage || "Failed to update subscription");
					return;
				}
				const status = value
					? t("Contacts.subscriptions.activated")
					: t("Contacts.subscriptions.deactivated");
				toast.success(t("Contacts.subscriptions.statusChange", { status }));
				router.refresh();
			}}
		/>
	);
};

export const columns: ColumnDef<Subscription>[] = [
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

	// Fixed: guard channel and provide a sortable accessor
	{
		id: "channelName",
		header: "Name",
		accessorFn: (row) => row.channel?.name ?? "Unknown channel",
		cell: ({ row }) => {
			const name = row.original.channel?.name ?? "Unknown channel";
			return <div>{name}</div>;
		},
	},

	{
		accessorKey: "createdAt",
		header: "Created At",
		meta: { hidden: true },
		cell: ({ row }) => (
			<div>{formatDateTimeStrapi(row.original.createdAt)}</div>
		),
	},
	{
		accessorKey: "updatedAt",
		header: "Updated At",
		cell: ({ row }) => (
			<div>{formatDateTimeStrapi(row.original.updatedAt)}</div>
		),
	},
	{
		accessorKey: "active",
		header: "Active",
		cell: ({ row }) => <SwitchAction subscription={row.original} />,
	},

	// consent is already guarded
	{
		accessorKey: "consent",
		header: "Consent Version",
		cell: ({ row }) => {
			const consent = row.original.consent;
			return (
				<div>
					{consent?.version ? (
						<Link
							href={`${RouteConfig.policy.single((consent.version))}`}
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center font-medium hover:text-red-800"
						>
							version {consent.version}
						</Link>
					) : (
						<span className="text-gray-400">No version</span>
					)}
				</div>
			);
		},
	},
	{
		id: "delete",
		cell: ({ row }) => <DeleteAction subscription={row.original} />,
	},
];
