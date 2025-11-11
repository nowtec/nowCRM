"use client";
import type { ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type React from "react";
import { FaRegEye, FaRegTrashCan } from "react-icons/fa6";
import { SortableHeader } from "@/components/dataTable/SortableHeader";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDateTimeStrapi } from "@/lib/strapiDate";
import { ContactDocument } from "@nowcrm/services";

const DeleteAction: React.FC<{ document: ContactDocument }> = ({ document }) => {
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
						const { deleteAction } = await import("./deleteDocument");
						await deleteAction(document.documentId);
						toast.success(t("Contacts.documents.documentDeleted"));
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

export const ViewAction: React.FC<{ document: ContactDocument }> = ({ document }) => {
	const t = useTranslations();

	const handleCopyLink = async () => {
		const { default: toast } = await import("react-hot-toast");
		if (!document.file.url) return;
		try {
			await navigator.clipboard.writeText(document.file.url);
			toast.success(t("Contacts.documents.linkCopied"));
		} catch (_err) {
			toast.error(t("Contacts.documents.failedLinkCopied"));
		}
	};

	if (!document.file.url) return null;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger>
				<FaRegEye className="h-4 w-4" />
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuItem asChild>
					<a href={document.file.url} target="_blank" rel="noopener noreferrer">
						{t("common.actions.view")}
					</a>
				</DropdownMenuItem>
				<DropdownMenuItem onClick={handleCopyLink}>
					{t("Contacts.documents.linkCopied")}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};

export const columns: ColumnDef<ContactDocument>[] = [
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
		header: ({ column }) => <SortableHeader column={column} label="Type" />,
	},
	{
		accessorKey: "size",
		header: "Size",
		cell: ({ row }) => {
			return <div>{row.original.file.size}</div>;
		},
	},
	{
		accessorKey: "ext",
		header: "Ext",
		cell: ({ row }) => {
			return <div>{row.original.file.ext}</div>;
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
		id: "view",
		cell: ({ row }) => {
			const document = row.original;
			return <ViewAction document={document} />;
		},
	},
	{
		id: "delete",
		cell: ({ row }) => {
			const document = row.original;
			return <DeleteAction document={document} />;
		},
	},
];
