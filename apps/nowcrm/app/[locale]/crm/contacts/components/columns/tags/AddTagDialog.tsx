"use client";

import { Plus, TagIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { fetchTags } from "@/lib/actions/tags/fetch-tags";
import { DocumentId, Tag } from "@nowcrm/services";


interface AddTagDialogProps {
	contactId: DocumentId;
	currentTags: Tag[];
	onTagAdded: (tag: Tag) => void;
}

export function AddTagDialog({
	contactId,
	currentTags,
	onTagAdded,
}: AddTagDialogProps) {
	const [open, setOpen] = useState(false);
	const [tags, setTags] = useState<Tag[]>([]);
	const [loading, setLoading] = useState(false);

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

	const availableTags = tags.filter(
		(tag) => !currentTags.some((currentTag) => currentTag.id === tag.id),
	);

	const handleAddTag = async (tag: Tag) => {
		setLoading(true);
		try {
			onTagAdded(tag);
			setOpen(false);
		} catch (error) {
			console.error("Failed to add tag", error);
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					className="h-6 w-6 rounded-full p-0 transition-colors hover:bg-accent/50"
				>
					<Plus className="h-3 w-3" />
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<TagIcon className="h-5 w-5" />
						Add Tag
					</DialogTitle>
					<DialogDescription>
						Select a tag to add to this contact.
					</DialogDescription>
				</DialogHeader>
				<Command className="rounded-lg border shadow-md">
					<CommandInput placeholder="Search tags..." />
					<CommandList>
						<CommandEmpty>No tags found.</CommandEmpty>
						<CommandGroup>
							{availableTags.map((tag) => (
								<CommandItem
									key={tag.id}
									onSelect={() => handleAddTag(tag)}
									className="flex cursor-pointer items-center gap-2"
									disabled={loading}
								>
									<div
										className="h-3 w-3 rounded-full"
										style={{ backgroundColor: tag.color }}
									/>
									<Badge
										variant="secondary"
										className="px-2 py-0.5 font-medium text-xs"
										style={{
											backgroundColor: `${tag.color}20`,
											color: tag.color,
											border: `1px solid ${tag.color}40`,
										}}
									>
										{tag.name}
									</Badge>
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</DialogContent>
		</Dialog>
	);
}
