//  contactsapp/app/[locale]/crm/contacts/components/columns/ContactColumns.tsx
"use client";
import type { CommunicationChannelKeys, Contact } from "@nowcrm/services";
import type { ColumnDef } from "@tanstack/react-table";
import { ChevronDown, ChevronUp, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Session } from "next-auth";
import { useMessages } from "next-intl";
import { useState } from "react";
import toast from "react-hot-toast";
import { TagsCell } from "@/components/dataTable/shared_cols/tags/tag-cell";
import { TagFilterHeader } from "@/components/dataTable/shared_cols/tags/tag-filter-header";
import { SortableHeader } from "@/components/dataTable/sortable-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { cn, toNames } from "@/lib/utils";
import { CountryFilterHeader } from "./countries/country-filter-header";

const ViewActions: React.FC<{
	contact: Contact;
	onRefetch?: () => void;
}> = ({ contact, onRefetch }) => {
	const t = useMessages();
	const router = useRouter();

	return (
		<div className="text-center">
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="ghost" className="h-8 w-8 p-0">
						<span className="sr-only">{t.common.actions.openMenu}</span>
						<MoreHorizontal className="h-4 w-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuLabel>{t.common.actions.actions}</DropdownMenuLabel>
					<Link
						href={`${RouteConfig.contacts.single.base(contact.documentId)}`}
					>
						<DropdownMenuItem>{t.common.actions.view}</DropdownMenuItem>
					</Link>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						onClick={async () => {
							const { duplicateContactAction } = await import(
								"@/lib/actions/contacts/duplicate-contact"
							);
							const res = await duplicateContactAction(contact.documentId);
							if (!res.success) {
								toast.error(res.errorMessage ?? "Failed to duplicate contact");
								return;
							}
							toast.success("Contact duplicated");
							if (onRefetch) {
								onRefetch();
							} else {
								router.refresh();
							}
						}}
					>
						Duplicate
					</DropdownMenuItem>
					<DropdownMenuItem
						onClick={async () => {
							const { deleteContactAction } = await import("./contact-delete");
							const res = await deleteContactAction(contact.documentId);
							if (!res.success) {
								toast.error(res.errorMessage ?? "Failed to delete contact");
								return;
							}
							toast.success(t.Contacts.deleteContact);
							if (onRefetch) {
								onRefetch();
							} else {
								router.refresh();
							}
						}}
					>
						Delete
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
};

type Props = {
	contact: Contact;
};

export const SurveyItemsCell: React.FC<Props> = ({ contact }) => {
	const [expanded, setExpanded] = useState(false);
	const items = contact.surveys || [];

	const visibleItems = expanded ? items : items.slice(0, 2);
	const hasMore = items.length > 2;

	return (
		<div className="flex flex-col gap-2">
			<div className="flex flex-wrap gap-2">
				{visibleItems.map((item, index) => (
					<Card
						key={`${item.id}-${index}`}
						className="w-fit rounded-md border bg-muted shadow-none"
					>
						<CardContent className="px-3 py-1 text-sm">
							<strong>{item.name}</strong>: {item.form_id}
						</CardContent>
					</Card>
				))}
			</div>

			{hasMore && (
				<Button
					variant="link"
					size="sm"
					className="inline-flex items-center gap-1 px-0 text-muted-foreground text-xs"
					onClick={() => setExpanded(!expanded)}
				>
					{expanded ? "Show less" : `+${items.length - 2} more`}
					{expanded ? (
						<ChevronUp className="h-4 w-4" />
					) : (
						<ChevronDown className="h-4 w-4" />
					)}
				</Button>
			)}
		</div>
	);
};

const ViewContact: React.FC<{ contact: Contact; cell: any }> = ({
	contact,
	cell,
}) => {
	const isEmailColumn =
		cell.column.id === "email" || cell.column.columnDef.accessorKey === "email";
	return (
		<div className="flex cursor-pointer space-x-2">
			<Link
				href={`${RouteConfig.contacts.single.base(contact.documentId)}`}
				className={cn(
					"font-medium",
					!isEmailColumn && "max-w-[150px] truncate",
				)}
			>
				{cell.renderValue() as any}
			</Link>
		</div>
	);
};

export const getColumns = (
	session?: Session | null,
	onRefetch?: () => void,
): ColumnDef<Contact>[] => [
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
		accessorKey: "first_name",
		header: ({ column }) => (
			<SortableHeader column={column} label="First Name" />
		),
		cell: ({ row, cell }) => {
			return (
				<span className="hover:underline">
					<ViewContact contact={row.original} cell={cell} />
				</span>
			);
		},
	},
	{
		accessorKey: "last_name",
		header: ({ column }) => (
			<SortableHeader column={column} label="Last Name" />
		),
		cell: ({ row, cell }) => {
			return (
				<span className="hover:underline">
					<ViewContact contact={row.original} cell={cell} />
				</span>
			);
		},
	},
	{
		accessorKey: "email",
		header: "Email",
		cell: ({ row, cell }) => {
			return (
				<span className="hover:underline">
					<ViewContact contact={row.original} cell={cell} />
				</span>
			);
		},
	},
	{
		accessorKey: "subscriptions",
		header: "Active Subscriptions",
		accessorFn: (row) =>
			row.subscriptions
				?.filter((sub) => !!sub?.active)
				.map((sub) => sub?.channel?.name ?? "")
				.filter((n) => n && n.trim().length > 0)
				.join(", ") || "",
		cell: ({ row }) => {
			const names =
				row.original.subscriptions
					?.filter((sub) => !!sub?.active)
					.map((sub) => sub?.channel?.name ?? null)
					.filter(
						(n): n is CommunicationChannelKeys => !!n && n.trim().length > 0,
					)
					.join(", ") || "None";
			return <p>{names}</p>;
		},
		meta: { hidden: true },
	},
	{
		accessorKey: "birth_date",
		header: "Birthdate",
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
		accessorKey: "language",
		header: "Language",
		meta: {
			hidden: true,
		},
	},
	{
		accessorKey: "function",
		header: ({ column }) => <SortableHeader column={column} label="Function" />,
		meta: {
			hidden: true,
		},
	},
	{
		accessorKey: "address_line1",
		header: "Adress Line 1",
		meta: {
			hidden: true,
		},
	},
	{
		accessorKey: "address_line2",
		header: "Adress Line 2",
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
		accessorKey: "location",
		header: ({ column }) => <SortableHeader column={column} label="Location" />,
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
		accessorKey: "country",
		header: () => <CountryFilterHeader />,
	},
	{
		accessorKey: "organization",
		header: "Organization",
		cell: ({ row }) => {
			const contact = row.original;
			return <>{contact.organization?.name ?? ""}</>;
		},
		meta: { hidden: true },
	},
	{
		accessorKey: "lists",
		header: "Lists",
		cell: ({ row }) => <p>{toNames(row.original.lists)}</p>,
		meta: {
			hidden: true,
		},
	},
	{
		accessorKey: "keywords",
		header: "Keywords",
		cell: ({ row }) => <p>{toNames(row.original.keywords)}</p>,
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
		accessorKey: "mobile_phone",
		header: "Mobile Phone",
		meta: {
			hidden: true,
		},
	},
	{
		accessorKey: "contact_interests",
		header: "Contact Interests",
		cell: ({ row }) => <p>{toNames(row.original.contact_interests)}</p>,
		meta: {
			hidden: true,
		},
	},
	{
		accessorKey: "contact_types",
		header: "Contact Types",
		accessorFn: (row) =>
			row.contact_types
				?.map((ct) => ct?.name ?? "")
				.filter((n) => n && n.trim().length > 0)
				.join(", ") || "",
		cell: ({ row }) => <p>{toNames(row.original.contact_types)}</p>,
		meta: {
			hidden: true,
		},
	},
	{
		accessorKey: "department",
		header: "Department",
		cell: ({ row }) => {
			const contact = row.original;
			return <>{contact.department?.name ?? ""}</>;
		},
		meta: { hidden: true },
	},
	{
		accessorKey: "title",
		header: "Title",
		cell: ({ row }) => {
			const contact = row.original;
			return <>{contact.title?.name ?? ""}</>;
		},
		meta: { hidden: true },
	},
	{
		accessorKey: "salutation",
		header: "Salutation",
		cell: ({ row }) => {
			const contact = row.original;
			return <>{contact.salutation?.name ?? ""}</>;
		},
		meta: { hidden: true },
	},
	{
		accessorKey: "job_title",
		header: "Job Title",
		cell: ({ row }) => {
			const contact = row.original;
			return <>{contact.job_title?.name ?? ""}</>;
		},
		meta: { hidden: true },
	},
	{
		accessorKey: "industry",
		header: "Industry",
		cell: ({ row }) => {
			const contact = row.original;
			return <>{contact.industry?.name ?? ""}</>;
		},
		meta: { hidden: true },
	},
	{
		accessorKey: "job_description",
		header: "Job Description",
		meta: {
			hidden: true,
		},
	},
	{
		accessorKey: "duration_role",
		header: "Duration in Role (years)",
		meta: {
			hidden: true,
		},
	},
	{
		accessorKey: "connection_degree",
		header: "Connection Degree",
		meta: {
			hidden: true,
		},
	},
	{
		accessorKey: "journeys",
		header: "Journeys",
		cell: ({ row }) => <p>{toNames(row.original.journeys)}</p>,
		meta: {
			hidden: true,
		},
	},
	{
		accessorKey: "journey_steps",
		header: "Journey Steps",
		cell: ({ row }) => <p>{toNames(row.original.journey_steps)}</p>,
		meta: {
			hidden: true,
		},
	},
	{
		accessorKey: "surveys",
		header: "Surveys",
		cell: ({ row }) => {
			const contact = row.original;
			return <SurveyItemsCell contact={contact} />;
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
		accessorKey: "tags",
		header: () => <TagFilterHeader session={session} entityName="contacts" />,
		cell: ({ row }) => {
			const tags = row.original.tags || [];
			return (
				<TagsCell
					serviceName="contactsService"
					entityId={row.original.documentId}
					initialTags={tags}
				/>
			);
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
		header: ({ column }) => <div className="text-center">Actions</div>,
		cell: ({ row }) => {
			const contact = row.original;
			return <ViewActions contact={contact} onRefetch={onRefetch} />;
		},
	},
];
