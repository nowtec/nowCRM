"use client";
import type { FormEntity } from "@nowcrm/services";
import type { ColumnDef } from "@tanstack/react-table";
import { Copy, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { Switch } from "@/components/ui/switch";
import { updateForm } from "@/lib/actions/forms/update-form";
import { RouteConfig } from "@/lib/config/RoutesConfig";
import { formatDateTimeStrapi } from "@/lib/strapiDate";
import { shareForm } from "./shareForm";

const ViewActions: React.FC<{ form: FormEntity }> = ({ form }) => {
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
					<Link href={`${RouteConfig.forms.single(form.documentId)}`}>
						<DropdownMenuItem>Build and review</DropdownMenuItem>
					</Link>
					<Link href={`${RouteConfig.forms.results(form.documentId)}`}>
						<DropdownMenuItem>View results</DropdownMenuItem>
					</Link>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						onClick={async () => {
							const { duplicateFormAction } = await import(
								"@/lib/actions/forms/duplicate-form"
							);
							const res = await duplicateFormAction(form.documentId);
							if (!res.success) {
								toast.error(res.errorMessage ?? "Failed to duplicate form");
								return;
							}
							toast.success("Form duplicated");
							router.refresh();
						}}
					>
						Duplicate
					</DropdownMenuItem>
					<DropdownMenuItem
						onClick={async () => {
							const { deleteFormAction } = await import(
								"@/lib/actions/forms/delete-form"
							);
							const res = await deleteFormAction(form.documentId);
							if (!res.success) {
								toast.error(res.errorMessage ?? "Failed to delete form");
								return;
							}
							toast.success("Form deleted");
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

const SwitchAction: React.FC<{ form: FormEntity }> = ({ form }) => {
	const router = useRouter();

	return (
		<Switch
			defaultChecked={form.active}
			onCheckedChange={async (value) => {
				console.log(form.documentId)
				const res = await updateForm(form.documentId, { active: value });
				if (!res.success) {
					toast.error(res.errorMessage ?? "Failed to update form");
					return;
				}
				toast.success(`Form ${value ? "activated" : "deactivated"}`);
				router.refresh();
			}}
		/>
	);
};

const ShareAction: React.FC<{ form: FormEntity }> = ({ form }) => {
	const handleShare = async () => {
		const shareLink = await shareForm(form.documentId, form.slug);
		await navigator.clipboard.writeText(shareLink);
		toast.success("Link copied to clipboard");
	};

	return (
		<Button
			size="sm"
			className="hidden h-7 cursor-pointer gap-1 border border-muted-foreground/25 bg-sidebar-accent px-2 text-muted-foreground text-xs transition-none hover:border-primary hover:bg-primary hover:text-white lg:flex [&_svg]:size-3"
			onClick={handleShare}
			disabled={!form.active}
		>
			<Copy className="h-4 w-4" />
			Permalink
		</Button>
	);
};

export const columns: ColumnDef<FormEntity>[] = [
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
			const form = row.original;
			return (
				<Link
					href={`${RouteConfig.forms.single(form.documentId)}`}
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
			return (
				<div className="whitespace-nowrap">
					{formatDateTimeStrapi(row.original.createdAt)}
				</div>
			);
		},
	},
	{
		accessorKey: "updatedAt",
		header: ({ column }) => <SortableHeader column={column} label="Updated" />,
		cell: ({ row }) => {
			return (
				<div className="whitespace-nowrap">
					{formatDateTimeStrapi(row.original.updatedAt)}
				</div>
			);
		},
	},
	{
		accessorKey: "slug",
		header: "Slug",
		cell: ({ row }) => {
			return <div className="whitespace-nowrap">{row.original.slug}</div>;
		},
	},
	{
		accessorKey: "active",
		header: "Active",
		cell: ({ row }) => {
			const form = row.original;
			return <SwitchAction form={form} />;
		},
	},
	{
		id: "share",
		header: "Share",
		cell: ({ row }) => {
			const form = row.original;
			return <ShareAction form={form} />;
		},
	},
	{
		id: "actions",
		header: ({ column }) => <div className="text-center">Actions</div>,
		cell: ({ row }) => {
			const form = row.original;
			return <ViewActions form={form} />;
		},
	},
];
