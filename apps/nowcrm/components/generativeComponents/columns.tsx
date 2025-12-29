"use client";

import type { Contact } from "@nowcrm/services";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
//EXIST BECAUSE OF NOT ALL COLUMNS NEEDED INSIDE PREVIEW
import { RouteConfig } from "@/lib/config/routes-config";

export const columns: ColumnDef<Contact>[] = [
	{
		accessorKey: "first_name",
		header: "First name",
		cell: ({ row, cell }) => {
			const contact = row.original;
			return (
				<Link
					href={`${RouteConfig.contacts.single.base(contact.documentId)}`}
					className="font-medium"
				>
					{cell.renderValue() as any}
				</Link>
			);
		},
	},
	{
		accessorKey: "last_name",
		header: "Last name",
	},
	{
		accessorKey: "email",
		header: "Email",
	},
	{
		accessorKey: "function",
		header: "Function",
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
		header: "Gender",
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
		accessorKey: "tags",
		header: "Tags",
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
];
