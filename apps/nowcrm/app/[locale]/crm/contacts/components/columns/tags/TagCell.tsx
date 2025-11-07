"use client";

import { Loader2, X } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { addTag } from "@/lib/actions/tags/add-tag";
import { removeTag } from "@/lib/actions/tags/remove-tag";
import type { ServiceName } from "@/lib/services/common/serviceFactory";
import { AddTagDialog } from "./AddTagDialog";

type Tag = { id: number; name: string; color: string };

interface TagsCellProps {
	serviceName: ServiceName;
	entityId: number;
	initialTags: Tag[];
}

export function TagsCell({
	serviceName,
	entityId,
	initialTags,
}: TagsCellProps) {
	const [tags, setTags] = useState<Tag[]>(initialTags || []);
	const [adding, setAdding] = useState(false);
	const [removingTagId, setRemovingTagId] = useState<number | null>(null);

	const handleTagAdded = async (newTag: Tag) => {
		setAdding(true);
		try {
			const res = await addTag(serviceName, entityId, newTag.id);
			if (res.success) {
				setTags((prev) => [...prev, newTag]);
			}
		} finally {
			setAdding(false);
		}
	};

	const handleTagRemoved = async (tagId: number) => {
		setRemovingTagId(tagId);
		try {
			const res = await removeTag(serviceName, entityId, tagId);
			if (res.success) {
				setTags((prev) => prev.filter((tag) => tag.id !== tagId));
			}
		} finally {
			setRemovingTagId(null);
		}
	};

	if (!tags.length) {
		return (
			<div className="flex items-center gap-2">
				<AddTagDialog
					contactId={entityId}
					currentTags={tags}
					onTagAdded={handleTagAdded}
				/>
				{adding && (
					<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
				)}
			</div>
		);
	}

	return (
		<div className="flex flex-wrap items-center gap-1.5">
			{tags.map((tag) => (
				<div key={tag.id} className="group relative">
					<Badge
						variant="secondary"
						className="rounded-full px-2 py-1 font-medium text-xs transition-all hover:shadow-sm"
						style={{
							backgroundColor: `${tag.color}15`,
							color: tag.color,
							border: `1px solid ${tag.color}30`,
						}}
					>
						{tag.name}
						<Button
							variant="ghost"
							size="sm"
							onClick={() => handleTagRemoved(tag.id)}
							disabled={removingTagId === tag.id}
							className="ml-1 h-3 w-3 rounded-full p-0 opacity-0 transition-opacity hover:bg-destructive/20 group-hover:opacity-100"
						>
							{removingTagId === tag.id ? (
								<Loader2 className="h-2 w-2 animate-spin" />
							) : (
								<X className="h-2 w-2" />
							)}
						</Button>
					</Badge>
				</div>
			))}
			<AddTagDialog
				contactId={entityId}
				currentTags={tags}
				onTagAdded={handleTagAdded}
			/>
			{adding && (
				<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
			)}
		</div>
	);
}
