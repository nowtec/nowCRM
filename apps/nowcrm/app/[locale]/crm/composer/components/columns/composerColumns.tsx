"use client";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMessages } from "next-intl";
import toast from "react-hot-toast";
import { SortableHeader } from "@/components/dataTable/SortableHeader";
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
import { RouteConfig } from "@/lib/config/RoutesConfig";
import { formatDateTimeStrapi } from "@/lib/strapiDate";
import type { Composition } from "@/lib/types/new_type/composition";
import { cn } from "@/lib/utils";
import { deleteCompositionAction } from "./deleteComposition";

const ViewActions: React.FC<{ composition: Composition }> = ({
	composition,
}) => {
	const t = useMessages();
	const router = useRouter();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" className="h-8 w-8 p-0">
					<span className="sr-only">{t.common.actions.openMenu}</span>
					<MoreHorizontal className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuLabel>{t.common.actions.actions}</DropdownMenuLabel>
				<Link href={`${RouteConfig.composer.single(composition.id)}`}>
					<DropdownMenuItem>
						{t.Composer.channelContent.viewComposition}
					</DropdownMenuItem>
				</Link>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					onClick={async () => {
						const { duplicateCompositionAction } = await import(
							"@/lib/actions/composer/duplicate-composition"
						);
						const res = await duplicateCompositionAction(composition.id);
						if (!res.success) {
							toast.error(
								res.errorMessage ?? "Failed to duplicate composition",
							);
							return;
						}
						toast.success("Composition duplicated");
						router.refresh();
					}}
				>
					Duplicate
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={async () => {
						await deleteCompositionAction(composition.id);
						toast.success("Composition deleted");
						router.refresh();
					}}
				>
					Delete
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};

export const columns: ColumnDef<Composition>[] = [
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
		accessorKey: "createdAt",
		header: ({ column }) => <SortableHeader column={column} label="Created" />,
		cell: ({ row }) => {
			return <div>{formatDateTimeStrapi(row.original.createdAt)}</div>;
		},
		meta: {
			hidden: true,
		},
	},
	{
		accessorKey: "updatedAt",
		header: ({ column }) => <SortableHeader column={column} label="Updated" />,
		cell: ({ row }) => {
			return <div>{formatDateTimeStrapi(row.original.updatedAt)}</div>;
		},
		meta: {
			hidden: true,
		},
	},
	{
		accessorKey: "name",
		header: ({ column }) => <SortableHeader column={column} label="Name" />,
		cell: ({ row, cell }) => {
			const list = row.original;
			return (
				<Link
					href={`${RouteConfig.composer.single(list.id)}`}
					className="whitespace-nowrap font-medium hover:underline"
				>
					{cell.renderValue() as any}
				</Link>
			);
		},
	},
	{
		accessorKey: "category",
		header: ({ column }) => <SortableHeader column={column} label="Category" />,
	},
	{
		accessorKey: "language",
		header: ({ column }) => <SortableHeader column={column} label="Language" />,
	},
	{
		accessorKey: "persona",
		header: ({ column }) => <SortableHeader column={column} label="Persona" />,
	},
	{
		accessorKey: "status",
		header: "Status",
		cell: ({ row }) => {
			const status = row.original.status.toLowerCase();

			return (
				<div
					className={cn("rounded-full px-2 py-1 text-center font-medium", {
						"border border-red-800/25 bg-red-100 text-red-800 dark:border-text-red-200/25 dark:bg-red-900 dark:text-red-200":
							status.includes("error"),
						"border border-yellow-800/25 bg-yellow-100 text-yellow-800 dark:border-yellow-200/25 dark:bg-yellow-900 dark:text-yellow-200":
							status === "pending",
						"border border-green-800/25 bg-green-100 text-green-800 dark:border-green-200/25 dark:bg-green-900 dark:text-green-200":
							status === "finished",
					})}
				>
					{row.original.status}
				</div>
			);
		},
	},
	{
		accessorKey: "model",
		header: ({ column }) => <SortableHeader column={column} label="Model" />,
		meta: {
			hidden: true,
		},
	},
	{
		accessorKey: "add_unsubscribe",
		header: ({ column }) => (
			<SortableHeader column={column} label="Unsubscribe Link" />
		),
		cell: ({ row }) => <div>{row.original.add_unsubscribe ? "Yes" : "No"}</div>,
		meta: {
			hidden: true,
		},
	},
	{
		id: "actions",
		header: ({ column }) => <div className="text-center">Actions</div>,
		cell: ({ row }) => {
			const composition = row.original;
			return (
				<div className="text-center">
					<ViewActions composition={composition} />
				</div>
			);
		},
	},
];
