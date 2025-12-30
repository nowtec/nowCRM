"use client";

import { ChevronDown, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RouteConfig } from "@/lib/config/routes-config";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";

// Authorized navigation links and their dropdown options
const authorizedNavLinks = [
	{ href: RouteConfig.contacts.base, label: "Contacts" },
	{ href: RouteConfig.lists.base, label: "Lists" },
	{ href: RouteConfig.organizations.base, label: "Organizations" },
	{ href: RouteConfig.journeys.base, label: "Journeys" },
	{ href: RouteConfig.forms.base, label: "Forms" },
];

const authorizedImportOptions = [
	{ href: `${RouteConfig.import.base}/contacts`, label: "Import Contacts" },
	{
		href: `${RouteConfig.import.base}/organizations`,
		label: "Import Organizations",
	},
];

const authorizedComposerOptions = [
	{ href: `${RouteConfig.composer.base}`, label: "Composer" },
	{
		href: `${RouteConfig.composer.calendar}`,
		label: "Composer Calendar",
	},
];
// Public navigation links for unauthorized users
const publicNavLinks = [
	{ href: RouteConfig.userguide, label: "User Guide" },
	{ href: RouteConfig.policy.base, label: "Privacy Policy" },
	{ href: RouteConfig.terms, label: "Terms of Use" },
];

// Utility for link styling
const navLinkClasses = (isActive: boolean) =>
	cn(
		"flex items-center gap-1 rounded-sm px-3 font-medium text-sm [&_svg]:size-3",
		"hover:bg-sidebar-accent hover:text-accent-foreground dark:hover:text-white",
		{
			"bg-primary text-white hover:bg-primary hover:text-white": isActive,
			"text-muted-foreground": !isActive,
		},
	);

interface NavigationLinksProps {
	usePublic?: boolean;
}

export default function NavigationLinks({
	usePublic = false,
}: NavigationLinksProps) {
	const pathname = usePathname();

	if (usePublic) {
		return (
			<>
				{/* Desktop Nav */}
				<nav className="hidden space-x-2 md:flex">
					{publicNavLinks.map(({ href, label }) => {
						const isActive = pathname.includes(href);
						return (
							<Link key={href} href={href} className={navLinkClasses(isActive)}>
								{label}
							</Link>
						);
					})}
				</nav>

				{/* Mobile Nav */}
				<div className="flex md:hidden">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
								<Menu className="h-4 w-4" />
								Menu
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start" className="w-48">
							{publicNavLinks.map((link) => (
								<DropdownMenuItem key={link.href} asChild>
									<Link href={link.href}>{link.label}</Link>
								</DropdownMenuItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</>
		);
	}

	// Render authorized navigation links including the Import dropdown when usePublic is false
	return (
		<>
			{/* Desktop Nav */}
			<nav className="hidden space-x-2 md:flex">
				{authorizedNavLinks.map(({ href, label }) => {
					const isActive = pathname.includes(href);
					return (
						<Link key={href} href={href} className={navLinkClasses(isActive)}>
							{label}
						</Link>
					);
				})}

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							className={navLinkClasses(
								pathname.includes(RouteConfig.composer.base),
							)}
						>
							Composer
							<ChevronDown className="h-5 w-5" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start">
						{authorizedComposerOptions.map((option) => (
							<DropdownMenuItem key={option.href} asChild>
								<Link href={option.href}>{option.label}</Link>
							</DropdownMenuItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>

				{/* Import Dropdown for authorized users */}
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							className={navLinkClasses(
								pathname.includes(RouteConfig.import.base),
							)}
						>
							Import
							<ChevronDown className="h-5 w-5" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start">
						{authorizedImportOptions.map((option) => (
							<DropdownMenuItem key={option.href} asChild>
								<Link href={option.href}>{option.label}</Link>
							</DropdownMenuItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>
			</nav>
			{/* Mobile Nav */}
			<div className="flex md:hidden">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
							<Menu className="h-4 w-4" />
							Menu
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className="w-48">
						{[...authorizedNavLinks, ...authorizedImportOptions].map((link) => (
							<DropdownMenuItem key={link.href} asChild>
								<Link href={link.href}>{link.label}</Link>
							</DropdownMenuItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</>
	);
}
