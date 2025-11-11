"use client";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { FaRegTrashCan } from "react-icons/fa6";
import { SortableHeader } from "@/components/dataTable/SortableHeader";
import ErrorMessage from "@/components/ErrorMessage";
import Spinner from "@/components/Spinner";
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
import { getListCount } from "@/lib/actions/lists/get-list-count";
import { RouteConfig } from "@/lib/config/RoutesConfig";
import { formatDateTimeStrapi } from "@/lib/strapiDate";
import { List } from "@nowcrm/services";

const DeleteAction: React.FC<{ list: List }> = ({ list }) => {
	const router = useRouter();
	const params = useParams<{ locale: string; id: string }>();
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
						const { deleteListAction } = await import("./removeList");
						const res = await deleteListAction(list.documentId, (params.id));
						if (!res.success) {
							toast.error(res.errorMessage ?? "Failed to delete list");
							return;
						}
						toast.success(t("Contacts.lists.listDeleted"));
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

const ViewActions: React.FC<{ list: List }> = ({ list }) => {
	const t = useTranslations();
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" className="h-8 w-8 p-0">
					<span className="sr-only">{t("common.actions.openMenu")}</span>
					<MoreHorizontal className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuLabel>{t("common.actions.actions")}</DropdownMenuLabel>
				<Link href={`${RouteConfig.lists.single(list.documentId)}`}>
					<DropdownMenuItem>{t("common.actions.view")}</DropdownMenuItem>
				</Link>
				<DropdownMenuSeparator />
			</DropdownMenuContent>
		</DropdownMenu>
	);
};

const ListCount: React.FC<{ list: List }> = ({ list }) => {
	const [count, setCount] = useState<number | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [error, setError] = useState<any>(null);

	useEffect(() => {
		const fetchCount = async () => {
			try {
				const response = await getListCount(list.documentId);
				setCount(response.data);
				setIsLoading(false);
			} catch (_err) {
				setError(error);
				console.log(error);
			}
		};

		fetchCount();
	}, [list.documentId, error]);

	if (isLoading) return <Spinner size="small" />;
	if (error)
		return (
			<ErrorMessage
				response={{
					data: null,
					status: error.status,
					success: false,
					errorMessage: error.message,
				}}
			/>
		);

	return <div>{count}</div>;
};

export const columns: ColumnDef<List>[] = [
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
		cell: ({ row, cell }) => {
			const list = row.original;
			return (
				<Link
					href={`${RouteConfig.lists.single(list.documentId)}`}
					className=" font-medium"
				>
					{cell.renderValue() as any}
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
		header: "Count",
		cell: ({ row }) => {
			const list = row.original;
			return <ListCount list={list} />;
		},
	},
	{
		id: "actions",
		cell: ({ row }) => {
			const list = row.original;
			return <ViewActions list={list} />;
		},
	},
	{
		id: "delete",
		cell: ({ row }) => {
			const list = row.original;
			return <DeleteAction list={list} />;
		},
	},
];
