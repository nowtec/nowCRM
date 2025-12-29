"use client";
import type { Contact, DocumentId } from "@nowcrm/services";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { FaRegTrashCan } from "react-icons/fa6";
import { SortableHeader } from "@/components/dataTable/sortable-header";
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
import { RouteConfig } from "@/lib/config/routes-config";
import { formatDateTimeStrapi } from "@/lib/strapi-date";
import { removeContactFromListAction } from "./remove-contact-from-list";

const DeleteAction: React.FC<{ contact: Contact }> = ({ contact }) => {
	const router = useRouter();
	const path = usePathname();
	return (
		<DropdownMenu>
			<DropdownMenuTrigger>
				<FaRegTrashCan className="h-4 w-4" />
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuItem
					onClick={async () => {
						await removeContactFromListAction(
							path.split("/").pop() as DocumentId,
							contact.documentId,
						);
						toast.success("Contact removed from list");
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

const ViewActions: React.FC<{ contact: Contact }> = ({ contact }) => {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" className="h-8 w-8 p-0">
					<span className="sr-only">Open menu</span>
					<MoreHorizontal className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuLabel>Actions</DropdownMenuLabel>
				<Link href={`${RouteConfig.contacts.single.base(contact.documentId)}`}>
					<DropdownMenuItem>View contact</DropdownMenuItem>
				</Link>
				<DropdownMenuSeparator />
			</DropdownMenuContent>
		</DropdownMenu>
	);
};

const ViewContact: React.FC<{ contact: Contact; cell: any }> = ({
	contact,
	cell,
}) => {
	return (
		<div className="flex cursor-pointer space-x-2">
			<Link
				href={`${RouteConfig.contacts.single.base(contact.documentId)}`}
				className="max-w-[150px] truncate font-medium"
			>
				{cell.renderValue() as any}
			</Link>
		</div>
	);
};

export const columns: ColumnDef<Contact>[] = [
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
		accessorKey: "first_name",
		header: ({ column }) => (
			<SortableHeader column={column} label="First name" />
		),
		cell: ({ row, cell }) => {
			return <ViewContact contact={row.original} cell={cell} />;
		},
	},
	{
		accessorKey: "last_name",
		header: ({ column }) => (
			<SortableHeader column={column} label="Last name" />
		),
		cell: ({ row, cell }) => {
			return <ViewContact contact={row.original} cell={cell} />;
		},
	},
	{
		accessorKey: "email",
		header: ({ column }) => <SortableHeader column={column} label="Email" />,
		cell: ({ row, cell }) => {
			return <ViewContact contact={row.original} cell={cell} />;
		},
	},
	{
		accessorKey: "function",
		header: ({ column }) => <SortableHeader column={column} label="Function" />,
	},
	{
		accessorKey: "address_line1",
		header: "Adress line-1",
		meta: {
			hidden: true,
		},
	},
	{
		accessorKey: "address_line2",
		header: "Adress line-2",
		meta: {
			hidden: true,
		},
	},
	{
		accessorKey: "location",
		header: ({ column }) => <SortableHeader column={column} label="Location" />,
		meta: {
			hidden: true,
		},
	},
	{
		accessorKey: "canton",
		header: ({ column }) => <SortableHeader column={column} label="Canton" />,
		meta: {
			hidden: true,
		},
	},
	{
		accessorKey: "organization",
		header: "Organization",
		cell: ({ row }) => {
			const contact = row.original;
			return <>{contact.organization?.name}</>;
		},
		meta: {
			hidden: true,
		},
	},
	{
		accessorKey: "salutation",
		header: "Salutation",
		meta: {
			hidden: true,
		},
	},
	{
		accessorKey: "lists",
		header: "Lists",
		cell: ({ row }) => {
			const contact = row.original;
			const titles = contact.lists.map((item) => item.name).join(", ");
			return <p>{titles}</p>;
		},
		meta: {
			hidden: true,
		},
	},
	{
		accessorKey: "keywords",
		header: "Keywords",
		cell: ({ row }) => {
			const contact = row.original;
			const titles = contact.keywords.map((item) => item.name).join(", ");
			return <p>{titles}</p>;
		},
		meta: {
			hidden: true,
		},
	},
	{
		accessorKey: "phone",
		header: "Phone",
		meta: {
			hidden: true,
		},
	},
	{
		accessorKey: "contact_interests",
		header: "Contact interests",
		cell: ({ row }) => {
			const contact = row.original;
			const titles = contact.contact_interests
				.map((item) => item.name)
				.join(", ");
			return <p>{titles}</p>;
		},
		meta: {
			hidden: true,
		},
	},
	{
		accessorKey: "department",
		header: "Department",
		cell: ({ row }) => {
			const contact = row.original;
			return <>{contact.department?.name}</>;
		},
		meta: {
			hidden: true,
		},
	},
	{
		accessorKey: "language",
		header: "Language",
		meta: {
			hidden: true,
		},
	},
	{
		accessorKey: "gender",
		header: ({ column }) => <SortableHeader column={column} label="Gender" />,
		meta: {
			hidden: true,
		},
	},
	{
		accessorKey: "mobile_phone",
		header: "Mobile phone",
		meta: {
			hidden: true,
		},
	},
	{
		accessorKey: "zip",
		header: "ZIP",
		meta: {
			hidden: true,
		},
	},
	{
		accessorKey: "birth_date",
		header: "Birth date",
		meta: {
			hidden: true,
		},
	},
	{
		accessorKey: "journeys",
		header: "Journeys",
		cell: ({ row }) => {
			const contact = row.original;
			const titles = contact.journeys.map((item) => item.name).join(", ");
			return <p>{titles}</p>;
		},
		meta: {
			hidden: true,
		},
	},
	{
		accessorKey: "journey_steps",
		header: "Journey steps",
		cell: ({ row }) => {
			const contact = row.original;
			const titles = contact.journey_steps.map((item) => item.name).join(", ");
			return <p>{titles}</p>;
		},
		meta: {
			hidden: true,
		},
	},
	{
		accessorKey: "priority",
		header: "Priority",
		meta: {
			hidden: true,
		},
	},
	{
		accessorKey: "contact_status",
		header: "Contact Status",
		meta: {
			hidden: true,
		},
	},
	{
		accessorKey: "tag",
		header: "Tag",
		meta: {
			hidden: true,
		},
	},
	{
		accessorKey: "description",
		header: "Description",
		meta: {
			hidden: true,
		},
	},
	{
		accessorKey: "country",
		header: ({ column }) => <SortableHeader column={column} label="Country" />,
		meta: {
			hidden: true,
		},
	},
	{
		accessorKey: "linkedin_url",
		header: "LinkedIn url",
		meta: {
			hidden: true,
		},
	},
	{
		accessorKey: "facebook_url",
		header: "Facebook url",
		meta: {
			hidden: true,
		},
	},
	{
		accessorKey: "twitter_url",
		header: "Twitter(X) url",
		meta: {
			hidden: true,
		},
	},

	{
		id: "actions",
		header: "Actions",
		cell: ({ row }) => {
			const contact = row.original;

			return <ViewActions contact={contact} />;
		},
	},
	{
		id: "delete",
		header: "Delete",
		cell: ({ row }) => {
			const contact = row.original;
			return <DeleteAction contact={contact} />;
		},
	},
];
