"use client";

import { Calendar, Clock, KeyRound, List } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type React from "react";
import { FaMap } from "react-icons/fa";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RouteConfig } from "@/lib/config/RoutesConfig";
import { Contact, DocumentId } from "@nowcrm/services";

interface ListItem {
	id: DocumentId;
	name: string;
}

interface PersonalDetailsDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	contact: Contact;
}

export function PersonalDetailsDialog({
	open,
	onOpenChange,
	contact,
}: PersonalDetailsDialogProps) {
	const t = useTranslations();

	// New renderList accepts an array of ListItem and an optional function to generate a URL.
	const renderList = (
		title: string,
		items?: ListItem[],
		hrefFn?: (item: ListItem) => string,
		icon?: React.ReactNode,
	) => {
		if (!items || items.length === 0) return null;
		return (
			<div className="mb-6">
				<div className="mb-3 flex items-center gap-2">
					{icon && <span className="text-muted-foreground">{icon}</span>}
					<h3 className="font-medium text-sm">{title}</h3>
				</div>
				<div className="flex flex-wrap gap-2">
					{items.map((item, index) => {
						const isLinked = hrefFn && item.id;

						return (
							<div
								key={index}
								className={`rounded-full px-3 py-1.5 font-medium text-sm transition-all ${
									isLinked
										? "group bg-primary/10 text-primary hover:bg-primary/20"
										: "bg-secondary text-secondary-foreground hover:bg-secondary/80"
								}`}
							>
								{isLinked ? (
									<Link
										href={hrefFn(item)}
										className="flex items-center gap-1.5"
									>
										{item.name}
									</Link>
								) : (
									item.name
								)}
							</div>
						);
					})}
				</div>
			</div>
		);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[80vh] sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>
						{t("Contacts.details.personal.details.title")}
					</DialogTitle>
					<DialogDescription>
						{t("Contacts.details.personal.details.description")}{" "}
						{contact.first_name} {contact.last_name || ""}
					</DialogDescription>
				</DialogHeader>

				<ScrollArea className="mt-4 h-[400px] pr-4">
					<div className="space-y-2">
						{/* For sections that do not require a link, just pass the array and omit hrefFn */}
						{renderList(
							t("AdvancedFilters.fields.keywords"),
							contact.keywords?.map((item) => ({
								id: item.documentId,
								name: item.name,
							})),
							undefined,
							<KeyRound className="size-4" />,
						)}
						{/* For Lists, provide a href function that uses the list item's id */}
						{renderList(
							t("AdvancedFilters.fields.lists"),
							contact.lists?.map((item) => ({ id: item.documentId, name: item.name })),
							(item) => RouteConfig.lists.single(item.id),
							<List className="size-4" />,
						)}
						{renderList(
							t("AdvancedFilters.fields.journeys"),
							contact.journeys?.map((item) => ({
								id: item.documentId,
								name: item.name,
							})),
							(item) => RouteConfig.journeys.single(item.id),
							<FaMap className="size-4" />,
						)}
						{renderList(
							t("AdvancedFilters.fields.journey_step"),
							contact.journey_steps?.map((item) => ({
								id: item.documentId,
								name: item.name,
							})),
							undefined,
							<Clock className="size-4" />,
						)}

						{contact.last_access && (
							<div className="mb-6">
								<div className="mb-3 flex items-center gap-2">
									<Calendar className="size-4 text-muted-foreground" />
									<h3 className="font-medium text-sm">
										{t("Contacts.details.personal.details.lastAccess")}
									</h3>
								</div>
								<p className="text-muted-foreground text-sm">
									{contact.last_access.toString()}
								</p>
							</div>
						)}
					</div>
				</ScrollArea>
			</DialogContent>
		</Dialog>
	);
}
