"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import { RouteConfig } from "@/lib/config/RoutesConfig";
import { cn } from "@/lib/utils";
import { DocumentId } from "@nowcrm/services";

export default function TopBarContacts({ id }: { id: DocumentId }) {
	const t = useTranslations("Contacts");

	const sidebarNavItems = [
		{
			title: t("topBar.details"),
			href: RouteConfig.contacts.single.base,
		},
		{
			title: t("topBar.subscriptions"),
			href: RouteConfig.contacts.single.subscriptions,
		},
		{
			title: t("topBar.lists"),
			href: RouteConfig.contacts.single.lists,
		},
		{
			title: t("topBar.transactions"),
			href: RouteConfig.contacts.single.transactions,
		},
		{
			title: t("topBar.transaction_subscriptions"),
			href: RouteConfig.contacts.single.transaction_subscriptions,
		},
		{
			title: t("topBar.surveys"),
			href: RouteConfig.contacts.single.surveys,
		},
		{
			title: t("topBar.events"),
			href: RouteConfig.contacts.single.events,
		},
		{
			title: t("topBar.tasks"),
			href: RouteConfig.contacts.single.tasks,
		},
		{
			title: t("topBar.actions"),
			href: RouteConfig.contacts.single.actions,
		},
		{
			title: t("topBar.activity_logs"),
			href: RouteConfig.contacts.single.activity_logs,
		},
		{
			title: t("topBar.documents"),
			href: RouteConfig.contacts.single.documents,
		},
	];
	const pathname = usePathname();
	return (
		<nav className="w-full overflow-x-auto">
			<div className="flex min-w-max space-x-2 p-2">
				{sidebarNavItems.map((item) => (
					<Link
						key={item.href(id)}
						href={item.href(id)}
						className={cn(
							buttonVariants({ variant: "ghost" }),
							"transition-colors",
							pathname.includes(item.href(id))
								? "bg-muted text-foreground"
								: "text-muted-foreground hover:text-muted-foreground",
						)}
					>
						{item.title}
					</Link>
				))}
			</div>
		</nav>
	);
}
