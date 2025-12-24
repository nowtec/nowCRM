"use client";

import { BadgePlus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { DialogTitle } from "@radix-ui/react-dialog";
import { Editor } from "@tiptap/core";

interface StyledLinkButtonProps {
	editor: Editor;
}

const buttonStyles = {
	primary: {
		backgroundColor: "#3b82f6",
		color: "#ffffff",
		label: "Primary Blue",
	},
	secondary: {
		backgroundColor: "#6b7280",
		color: "#ffffff",
		label: "Secondary Gray",
	},
	success: {
		backgroundColor: "#10b981",
		color: "#ffffff",
		label: "Success Green",
	},
	danger: {
		backgroundColor: "#ef4444",
		color: "#ffffff",
		label: "Danger Red",
	},
	warning: {
		backgroundColor: "#f59e0b",
		color: "#ffffff",
		label: "Warning Orange",
	},
	dark: {
		backgroundColor: "#1f2937",
		color: "#ffffff",
		label: "Dark",
	},
	light: {
		backgroundColor: "#f3f4f6",
		color: "#1f2937",
		label: "Light",
	},
};

export default function StyledLinkButton({ editor }: StyledLinkButtonProps) {

	const [isOpen, setIsOpen] = useState(false);
	const [url, setUrl] = useState("");
	const [text, setText] = useState("");
	const [selectedStyle, setSelectedStyle] =
		useState<keyof typeof buttonStyles>("primary");
	const [isEditing, setIsEditing] = useState(false);
	const [editingNode, setEditingNode] = useState<any>(null);

	// Listen for edit button events
	useEffect(() => {
		const handleEditButtonLink = (event: Event) => {
			const customEvent = event as CustomEvent<{
				node: any;
				pos: number;
				href: string;
				text: string;
				style: string;
			}>;

			const { node, href, text, style } = customEvent.detail;

			setUrl(href || "");
			setText(text || "");
			setSelectedStyle((style as keyof typeof buttonStyles) || "primary");
			setIsEditing(true);
			setEditingNode(node);
			setIsOpen(true);
		};

		window.addEventListener("editButtonLink", handleEditButtonLink);

		return () => {
			window.removeEventListener("editButtonLink", handleEditButtonLink);
		};
	}, []);

	const handleCreateButtonLink = () => {
		if (!url || !text) return;

		if (isEditing && editingNode) {
			// Update existing button
			editor
				.chain()
				.focus()
				.updateButtonLink({
					href: url,
					text: text,
					style: selectedStyle,
				})
				.run();
		} else {
			// Create new button
			editor
				.chain()
				.focus()
				.setButtonLink({
					href: url,
					text: text,
					style: selectedStyle,
				})
				.run();
		}

		// Reset form
		resetForm();
	};

	const handleDeleteButton = () => {
		if (isEditing) {
			editor.chain().focus().unsetButtonLink().run();

			resetForm();
		}
	};

	const resetForm = () => {
		setUrl("");
		setText("");
		setSelectedStyle("primary");
		setIsEditing(false);
		setEditingNode(null);
		setIsOpen(false);
	};

	const handleOpenChange = (open: boolean) => {
		setIsOpen(open);
		if (!open) {
			resetForm();
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={handleOpenChange}>
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>
						<div>
							<DialogTrigger
								asChild
								className="cursor-pointer hover:text-muted-foreground"
							>
								<BadgePlus className="m-2 h-4 w-4" />
							</DialogTrigger>
						</div>
					</TooltipTrigger>
					<TooltipContent>Insert Button</TooltipContent>
				</Tooltip>
			</TooltipProvider>
			<DialogContent className="sm:max-w-md">
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<DialogTitle className="font-medium">
							{isEditing ? "Edit Button Link" : "Add Button Link"}
						</DialogTitle>
						{isEditing && (
							<Button
								variant="outline"
								size="sm"
								onClick={handleDeleteButton}
								className="text-red-600 hover:text-red-700"
							>
								<Trash2 className="h-4 w-4" />
							</Button>
						)}
					</div>

					<div className="space-y-2">
						<Label htmlFor="button-text">Button Text</Label>
						<Input
							id="button-text"
							placeholder="Click me"
							value={text}
							onChange={(e) => setText(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter" && url && text) {
									e.preventDefault();
									handleCreateButtonLink();
								}
							}}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="button-url">URL</Label>
						<Input
							id="button-url"
							placeholder="https://example.com"
							value={url}
							onChange={(e) => setUrl(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter" && url && text) {
									e.preventDefault();
									handleCreateButtonLink();
								}
							}}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="button-style">Button Style</Label>
						<Select
							value={selectedStyle}
							onValueChange={(value: keyof typeof buttonStyles) =>
								setSelectedStyle(value)
							}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{Object.entries(buttonStyles).map(([key, style]) => (
									<SelectItem key={key} value={key}>
										<div className="flex items-center gap-2">
											<div
												className="h-4 w-4 rounded border"
												style={{ backgroundColor: style.backgroundColor }}
											/>
											{style.label}
										</div>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Preview */}
					{text && (
						<div className="space-y-2">
							<Label>Preview</Label>
							<div className="rounded border bg-gray-50 p-3">
								<div
									style={{
										display: "inline-block",
										padding: "12px 24px",
										backgroundColor:
											buttonStyles[selectedStyle].backgroundColor,
										color: buttonStyles[selectedStyle].color,
										textDecoration: "none",
										borderRadius: "6px",
										fontWeight: "500",
										fontFamily:
											'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
										border: "none",
										cursor: "pointer",
										textAlign: "center" as const,
										lineHeight: "1.4",
										fontSize: "14px",
									}}
								>
									{text}
								</div>
							</div>
						</div>
					)}

					<div className="flex justify-end gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => handleOpenChange(false)}
						>
							Cancel
						</Button>
						<Button
							size="sm"
							onClick={handleCreateButtonLink}
							disabled={!url || !text}
						>
							{isEditing ? "Update" : "Add"} Button
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
