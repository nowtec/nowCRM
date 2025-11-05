"use client";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMessages } from "next-intl";
import toast from "react-hot-toast";
import { FaRegTrashCan } from "react-icons/fa6";
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
import type { Contact } from "@/lib/types/new_type/contact";

const DeleteAction: React.FC<{
	contact: Contact;
	stepId: number;
	refreshData: () => void;
}> = ({ contact, stepId, refreshData }) => {
	const t = useMessages();
	return (
		<DropdownMenu>
			<DropdownMenuTrigger>
				<FaRegTrashCan className="h-4 w-4" />
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuItem
					onClick={async () => {
						const { removeFromStepContact } = await import(
							"./remove_from_step"
						);
						await removeFromStepContact(contact.id, stepId);
						toast.success("Contact removed from step");
						refreshData();
					}}
				>
					{t.common.actions.confirm}
				</DropdownMenuItem>
				<DropdownMenuItem>{t.common.actions.cancel}</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};

const ViewActions: React.FC<{ contact: Contact }> = ({ contact }) => {
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
				<Link href={`${RouteConfig.contacts.single.base(contact.id)}`}>
					<DropdownMenuItem>{t.common.actions.view}</DropdownMenuItem>
				</Link>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					onClick={async () => {
						const { duplicateContactAction } = await import(
							"@/lib/actions/contacts/duplicate-contact"
						);
						const res = await duplicateContactAction(contact.id);
						if (!res.success) {
							toast.error(res.errorMessage ?? "Failed to duplicate contact");
							return;
						}
						toast.success("Contact duplicated");
						router.refresh();
					}}
				>
					Duplicate
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
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
			<SortableHeader column={column} label="First Name" />
		),
		cell: ({ row, cell }) => {
			const contact = row.original;
			return (
				<Link
					href={`${RouteConfig.contacts.single.base(contact.id)}`}
					className="font-medium"
				>
					{cell.renderValue() as any}
				</Link>
			);
		},
	},
	{
		accessorKey: "last_name",
		header: ({ column }) => (
			<SortableHeader column={column} label="Last Name" />
		),
	},
	{
		accessorKey: "email",
		header: "Email",
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
		header: "Location",
		meta: {
			hidden: true,
		},
	},
	{
		accessorKey: "canton",
		header: "Canton",
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
		header: "Contact Interests",
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
		header: "Gender",
		meta: {
			hidden: true,
		},
	},
	{
		accessorKey: "mobile_phone",
		header: "Mobile Phone",
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
		header: "Birthdate",
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
		accessorKey: "status",
		header: "Status",
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
		header: "Country",
		meta: {
			hidden: true,
		},
	},
	{
		accessorKey: "linkedin_url",
		header: "LinkedIn URL",
		meta: {
			hidden: true,
		},
	},
	{
		accessorKey: "facebook_url",
		header: "Facebook URL",
		meta: {
			hidden: true,
		},
	},
	{
		accessorKey: "twitter_url",
		header: "Twitter(X) URL",
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
		cell: ({ row, table }) => {
			const contact = row.original;
			const stepId = table.options.meta?.step_id;
			const refreshData = table.options.meta?.refreshData;
			return (
				<DeleteAction
					contact={contact}
					stepId={stepId as number}
					refreshData={refreshData as any}
				/>
			);
		},
	},
];
