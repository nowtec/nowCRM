"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getCrmVersion } from "@/lib/actions/crmversion/get-crm-version";
import { RouteConfig } from "@/lib/config/routes-config";
import { cn } from "@/lib/utils";

// Public navigation links for unauthorized users
const publicNavLinks = [
	{ href: RouteConfig.userguide, label: "User Guide" },
	{ href: RouteConfig.policy.base, label: "Privacy Policy" },
	{ href: RouteConfig.terms, label: "Terms of Use" }
];

export default function BottomNavigationLinks() {
	const pathname = usePathname();
	const [version, setVersion] = useState<string>("");

	useEffect(() => {
		const fetchVersion = async () => {
			try {
				const versionData = await getCrmVersion();
				setVersion(versionData);
			} catch (error) {
				console.error("Failed to fetch CRM version:", error);
			}
		};

		fetchVersion();
	}, []);

	return (
		<footer className="z-10 flex w-full flex-col bg-background">
			<nav className="flex justify-around py-2">
				{publicNavLinks.map(({ href, label }) => {
					const isActive = pathname.includes(href);
					return (
						<Link
							key={href}
							href={href}
							className={cn(
								"flex items-center justify-center gap-1 rounded-md px-3 py-1.5 font-normal text-sm transition-all duration-200 hover:bg-primary/5",
								{
									"text-primary": isActive,
									"text-muted-foreground hover:text-foreground": !isActive,
								},
							)}
						>
							{label}
						</Link>
					);
				})}
			</nav>

			<div className="flex items-center justify-center border-border/10 border-t py-1.5 text-muted-foreground/70 text-xs">
				{version && <span className="font-light">CRM Version: {version}</span>}
			</div>
		</footer>
	);
}
