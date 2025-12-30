"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getCrmVersion } from "@/lib/actions/crmversion/get-crm-version";
import { RouteConfig } from "@/lib/config/routes-config";

export default function Footer() {
	const pathname = usePathname();
	const [version, setVersion] = useState<string>("");

	const shouldHide =
		pathname.startsWith("/en/crm/journeys/") ||
		pathname.startsWith("/en/crm/forms/");

	useEffect(() => {
		if (shouldHide) return; // no need to fetch version if hidden

		const fetchVersion = async () => {
			try {
				const versionData = await getCrmVersion();
				setVersion(versionData);
			} catch (error) {
				console.error("Failed to fetch CRM version:", error);
			}
		};

		fetchVersion();
	}, [shouldHide]);

	if (shouldHide) {
		return null;
	}

	return (
		<footer className="border-t bg-background">
			<div className="container mx-auto px-4 py-6">
				<div className="flex flex-col items-center justify-between gap-4 text-muted-foreground text-sm md:flex-row">
					<div className="flex items-center gap-4">
						<span>© 2023 - {new Date().getFullYear()} nowCRM</span>
						{version && (
							<span className="rounded bg-muted px-2 py-1 font-mono text-xs">
								{version}
							</span>
						)}
					</div>

					<nav className="flex items-center">
						<a
							href={RouteConfig.policy.base}
							className="transition-colors hover:text-foreground"
						>
							Privacy Policy
						</a>
						<span className="mx-2">•</span>
						<a
							href={RouteConfig.terms}
							className="transition-colors hover:text-foreground"
						>
							Terms
						</a>
						<span className="mx-2">•</span>
						<a
							href={RouteConfig.userguide}
							className="transition-colors hover:text-foreground"
						>
							Guide
						</a>
						<span className="mx-2">•</span>
					</nav>
				</div>
			</div>
		</footer>
	);
}
