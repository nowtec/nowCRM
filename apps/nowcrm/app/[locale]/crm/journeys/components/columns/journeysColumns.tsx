"use client";
import type { ColumnDef } from "@tanstack/react-table";
import { ChevronDown, ChevronUp, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { SortableHeader } from "@/components/dataTable/SortableHeader";
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
import { Switch } from "@/components/ui/switch";
import { RouteConfig } from "@/lib/config/RoutesConfig";
import { formatDateTimeStrapi } from "@/lib/strapiDate";
import type { Journey } from "@nowcrm/services";
import { activateJourney } from "../../[id]/actions";

type Props = {
	journey: Journey;
};

export const JourneyStepsCell: React.FC<Props> = ({ journey }) => {
	const [expanded, setExpanded] = useState(false);
	const steps = journey.journey_steps || [];

	const visibleSteps = expanded ? steps : steps.slice(0, 2);
	const hasMore = steps.length > 2;

	return (
		<div className="flex items-center">
			<div className="flex flex-row items-start gap-2">
				<div className="flex flex-wrap gap-2">
					{visibleSteps.map((step, index) => (
						<Card
							key={`${step.id}-${index}`}
							className="w-fit rounded-md border bg-muted shadow-none"
						>
							<CardContent className="px-3 py-1 text-sm">
								{step.name}
							</CardContent>
						</Card>
					))}
				</div>

				{hasMore && (
					<Button
						variant="link"
						size="sm"
						className="inline-flex h-7 items-center gap-1 px-0 px-1 text-muted-foreground text-xs [&_svg]:size-3"
						onClick={() => setExpanded(!expanded)}
					>
						<span className="leading-7">
							{expanded ? "Show less" : `+${steps.length - 2} More`}
						</span>
						{expanded ? (
							<ChevronUp className="h-4 w-4" />
						) : (
							<ChevronDown className="h-4 w-4" />
						)}
					</Button>
				)}
			</div>
		</div>
	);
};

const ViewActions: React.FC<{ journey: Journey }> = ({ journey }) => {
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
					<Link href={`${RouteConfig.journeys.single(journey.documentId)}`}>
						<DropdownMenuItem>View journey</DropdownMenuItem>
					</Link>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						onClick={async () => {
							const { duplicateJourneyAction } = await import(
								"@/lib/actions/journeys/duplicate-journey"
							);
							const res = await duplicateJourneyAction(journey.documentId);
							if (!res.success) {
								toast.error(res.errorMessage ?? "Failed to duplicate journey");
								return;
							}
							toast.success("Journey duplicated");
							router.refresh();
						}}
					>
						Duplicate
					</DropdownMenuItem>
					<DropdownMenuItem
						onClick={async () => {
							const { deleteJourneyAction } = await import(
								"@/lib/actions/journeys/delete-journey"
							);
							const res = await deleteJourneyAction(journey.documentId);
							if (!res.success) {
								toast.error(res.errorMessage ?? "Failed to delete journey");
								return;
							}
							toast.success("Journey deleted");
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

const SwitchAction: React.FC<{ journey: Journey }> = ({ journey }) => {
	const router = useRouter();
	const [isActive, setIsActive] = useState(journey.active);
	return (
		<Switch
			checked={isActive}
			onCheckedChange={async (value) => {
				const res = await activateJourney(journey.documentId, value);
				if (res.success) {
					setIsActive(value);
					toast.success(`Journey ${value ? "activated" : "deactivated"}`);
					router.refresh();
				} else {
					toast.error(res.errorMessage as string);
				}
			}}
		/>
	);
};

export const columns: ColumnDef<Journey>[] = [
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
			const journey = row.original;
			return (
				<Link
					href={`${RouteConfig.journeys.single(journey.documentId)}`}
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
		accessorKey: "journey_steps",
		header: "Steps",
		cell: ({ row }) => {
			const journey = row.original;
			return <JourneyStepsCell journey={journey} />;
		},
	},
	{
		accessorKey: "active",
		header: "Active",
		cell: ({ row }) => {
			const journey = row.original;
			return <SwitchAction journey={journey} />;
		},
	},
	{
		id: "actions",
		header: ({ column }) => <div className="text-center">Actions</div>,
		cell: ({ row }) => {
			const journey = row.original;

			return <ViewActions journey={journey} />;
		},
	},
];
