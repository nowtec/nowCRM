"use client";

import { Filter, TagIcon, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useUrlState } from "@/components/dataTable/dataTableContacts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fetchTags } from "@/lib/actions/tags/fetch-tags";

type Tag = { id: number; name: string; color: string };

export function TagFilterHeader() {
	const [tags, setTags] = useState<Tag[]>([]);
	const { updateUrl, getParam } = useUrlState();
	const selectedTag = getParam?.("tag");

	useEffect(() => {
		const fetchAndSetTags = async () => {
			try {
				const res = await fetchTags();
				setTags(res.data || []);
			} catch (e) {
				console.error("Failed to fetch tags", e);
			}
		};
		fetchAndSetTags();
	}, []);

	const handleSelect = (tagId: string | null) => {
		updateUrl?.({ tag: tagId });
	};

	const selectedTagData = tags.find((t) => String(t.id) === selectedTag);

	return (
		<div className="flex items-center gap-2">
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						size="sm"
						className="h-8 border-2 border-dashed px-2 transition-colors hover:bg-accent/50 lg:px-3"
					>
						<Filter className="mr-2 h-4 w-4" />
						<span className="font-medium">Tags</span>
						{selectedTagData && (
							<div className="ml-2 flex items-center gap-1">
								<Badge
									variant="secondary"
									className="rounded-full px-2 py-0.5 font-medium text-xs"
									style={{
										backgroundColor: `${selectedTagData.color}20`,
										color: selectedTagData.color,
										border: `1px solid ${selectedTagData.color}40`,
									}}
								>
									{selectedTagData.name}
								</Badge>
							</div>
						)}
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start" className="w-56">
					<DropdownMenuLabel className="flex items-center gap-2">
						<TagIcon className="h-4 w-4" />
						Filter by Tag
					</DropdownMenuLabel>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						onClick={() => handleSelect(null)}
						className="flex items-center gap-2"
					>
						<div className="h-3 w-3 rounded-full bg-muted-foreground/20" />
						All Tags
					</DropdownMenuItem>
					{tags.map((tag) => (
						<DropdownMenuItem
							key={tag.id}
							onClick={() => handleSelect(String(tag.id))}
							className="flex items-center gap-2"
						>
							<div
								className="h-3 w-3 rounded-full"
								style={{ backgroundColor: tag.color }}
							/>
							<span className="flex-1">{tag.name}</span>
							{selectedTag === String(tag.id) && (
								<div className="h-2 w-2 rounded-full bg-primary" />
							)}
						</DropdownMenuItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>

			{selectedTag && (
				<Button
					variant="ghost"
					size="sm"
					onClick={() => handleSelect(null)}
					className="h-8 px-2 text-muted-foreground hover:text-foreground"
				>
					<X className="h-4 w-4" />
				</Button>
			)}
		</div>
	);
}
