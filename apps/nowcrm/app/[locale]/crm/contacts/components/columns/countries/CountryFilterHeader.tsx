"use client";

import { ChevronDown, Globe } from "lucide-react";
import { useEffect, useState } from "react";
import { useUrlState } from "@/components/dataTable/dataTableContacts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getCountries } from "@/lib/actions/contacts/get-unique-contact-countries";

type CountryWithCount = { name: string; count: number };

export function CountryFilterHeader() {
	const [countries, setCountries] = useState<CountryWithCount[]>([]);
	const { updateUrl, getParam } = useUrlState();
	const selectedCountry = getParam?.("country");

	useEffect(() => {
		const fetchAndSetCountries = async () => {
			try {
				const res = await getCountries();
				setCountries(res.data || []);
			} catch (e) {
				console.error("Failed to fetch countries", e);
			}
		};
		fetchAndSetCountries();
	}, []);

	const handleSelect = (country: string | null) => {
		updateUrl({ country });
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="outline"
					size="sm"
					className="h-8 border-2 border-dashed transition-colors hover:bg-accent/50 lg:px-3"
				>
					<Globe className="h-4 w-4" />
					Country
					{selectedCountry && (
						<Badge
							variant="secondary"
							className="ml-1 px-2 py-0.5 font-medium text-xs"
						>
							{selectedCountry}
						</Badge>
					)}
					<ChevronDown className="h-3 w-3 opacity-50" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="w-64">
				<DropdownMenuLabel className="flex items-center gap-2 font-medium text-sm">
					<Globe className="h-4 w-4" />
					Filter by Country
				</DropdownMenuLabel>
				<DropdownMenuItem
					onClick={() => handleSelect(null)}
					className={`${!selectedCountry ? "bg-accent text-accent-foreground" : ""} cursor-pointer`}
				>
					<span className="flex w-full items-center justify-between">
						<span className="flex items-center gap-2">
							<Globe className="h-4 w-4" />
							All Countries
						</span>
						{!selectedCountry && (
							<span className="text-muted-foreground text-xs">✓</span>
						)}
					</span>
				</DropdownMenuItem>
				{countries.map((country) => (
					<DropdownMenuItem
						key={country.name}
						onClick={() => handleSelect(country.name)}
						className={`${selectedCountry === country.name ? "bg-accent text-accent-foreground" : ""} cursor-pointer`}
					>
						<span className="flex w-full items-center justify-between">
							<span className="flex items-center gap-2">
								<Globe className="h-4 w-4" />
								<span className="truncate">{country.name}</span>
							</span>
							<span className="ml-2 flex items-center gap-2">
								<Badge variant="outline" className="px-1.5 py-0.5 text-xs">
									{country.count}
								</Badge>
								{selectedCountry === country.name && (
									<span className="text-muted-foreground text-xs">✓</span>
								)}
							</span>
						</span>
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
