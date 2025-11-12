"use client";
import type { List } from "@nowcrm/services";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
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
import { TagsCell } from "../../../contacts/components/columns/tags/TagCell";
import { TagFilterHeader } from "../../../contacts/components/columns/tags/TagFilterHeader";
import CreateListDialog from "../createDialog";

const ViewActions: React.FC<{ list: List }> = ({ list }) => {
	const router = useRouter();
	return (
		<div className="text-center">
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="ghost" className="h-8 w-8 p-0">
						<span className="sr-only">Open menu</span>
						<MoreHorizontal className="h-4 w-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuLabel>Actions</DropdownMenuLabel>

					<Link href={`${RouteConfig.lists.single(list.documentId)}`}>
						<DropdownMenuItem>View List</DropdownMenuItem>
					</Link>

					<DropdownMenuSeparator />
					<DropdownMenuItem
						onClick={async () => {
							const { duplicateListAction } = await import(
								"@/lib/actions/lists/duplicate-list"
							);
							const res = await duplicateListAction(list.documentId);
							if (!res.success) {
								toast.error(res.errorMessage ?? "Failed to duplicate list");
								return;
							}
							toast.success("List duplicated");
							router.refresh();
						}}
					>
						Duplicate
					</DropdownMenuItem>

					<DropdownMenuSeparator />
					<CreateListDialog
						mode="rename"
						list={list}
						trigger={
							<DropdownMenuItem onSelect={(e) => e.preventDefault()}>
								Rename
							</DropdownMenuItem>
						}
					/>

					<DropdownMenuSeparator />
					<DropdownMenuItem
						onClick={async () => {
							const { deleteListAction } = await import(
								"@/lib/actions/lists/delete-list"
							);
							const res = await deleteListAction(list.documentId);
							if (!res.success) {
								toast.error(res.errorMessage ?? "Failed to delete list");
								return;
							}
							toast.success("List deleted");
							router.refresh();
						}}
					>
						Delete
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
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
				setCount(response.data?.count ?? null);
				setIsLoading(false);
			} catch (_err) {
				setError(error);
				console.log(error);
			}
		};

		fetchCount();
	}, [list.id, error]);

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
			<div className="flex h-full items-center">
				<Checkbox
					className="leading-0"
					checked={
						table.getIsAllPageRowsSelected() ||
						(table.getIsSomePageRowsSelected() && "indeterminate")
					}
					onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
					aria-label="Select all"
				/>
			</div>
		),
		cell: ({ row }) => (
			<div className="flex h-full items-center">
				<Checkbox
					checked={row.getIsSelected()}
					onCheckedChange={(value) => row.toggleSelected(!!value)}
					aria-label="Select row"
				/>
			</div>
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
					className="whitespace-nowrap font-medium hover:underline"
				>
					{cell.renderValue() as any}
				</Link>
			);
		},
	},
	{
		accessorKey: "createdAt",
		header: ({ column }) => <SortableHeader column={column} label="Created" />,
		cell: ({ row }) => {
			return <div>{formatDateTimeStrapi(row.original.createdAt)}</div>;
		},
	},
	{
		accessorKey: "updatedAt",
		header: ({ column }) => <SortableHeader column={column} label="Updated" />,
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
		accessorKey: "tags",
		header: () => <TagFilterHeader />,
		cell: ({ row }) => {
			const tags = row.original.tags || [];
			return (
				<TagsCell
					serviceName="listsService"
					entityId={row.original.documentId}
					initialTags={tags}
				/>
			);
		},
	},
	{
		id: "actions",
		header: ({ column }) => <div className="text-center">Actions</div>,
		cell: ({ row }) => {
			const list = row.original;

			return <ViewActions list={list} />;
		},
	},
];
