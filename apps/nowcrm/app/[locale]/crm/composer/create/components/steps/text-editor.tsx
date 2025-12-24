"use client";

import type { ReferenceComposition } from "@nowcrm/services";
import { HelpCircle, Loader2 } from "lucide-react";
import { useMessages } from "next-intl";
import { useState } from "react";
import Editor from "@/components/editor/editor-client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";

interface TextEditorProps {
	html: string;
	onChange: (html: string) => void;
	onRegenerate: (data: ReferenceComposition) => Promise<void>;
	composition: ReferenceComposition;
	onNext: () => void;
	onBack: () => void;
	includeUnsubscribe: boolean;
	setIncludeUnsubscribe: (value: boolean) => void;
}

export default function TextEditor({
	html,
	onChange,
	onRegenerate,
	composition,
	onNext,
	onBack,
	includeUnsubscribe,
	setIncludeUnsubscribe,
}: TextEditorProps) {
	const t = useMessages();
	const [isRegenerating, setIsRegenerating] = useState(false);
	// Check if content is still loading (no HTML content yet)
	const isLoading = !html;

	const handleRegenerate = async () => {
		setIsRegenerating(true);
		try {
			await onRegenerate(composition);
		} finally {
			setIsRegenerating(false);
		}
	};

	return (
		<div>
			<h2 className="mb-6 font-bold text-2xl">
				{t.Composer.textEditor.stepTitle}
			</h2>

			{isLoading ? (
				<div className="flex flex-col items-center justify-center py-16">
					<Loader2 className="mb-4 h-16 w-16 animate-spin text-primary" />
					<p className="text-muted-foreground">
						{t.Composer.textEditor.loading}
					</p>
				</div>
			) : (
				<Editor
					key="reference-editor"
					value={html}
					onChange={onChange as any}
				/>
			)}

			<div className="my-6 flex items-center space-x-2">
				<Checkbox
					id="unsubscribe"
					checked={includeUnsubscribe}
					onCheckedChange={(checked) =>
						setIncludeUnsubscribe(checked as boolean)
					}
				/>
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild className="flex">
							<label
								htmlFor="unsubscribe"
								className="font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
							>
								{t.Composer.textEditor.unsubscribeLabel}
								<HelpCircle className="ml-2 h-4 w-4 text-muted-foreground" />
							</label>
						</TooltipTrigger>
						<TooltipContent>
							<p className="w-[200px] text-xs">
								{t.Composer.textEditor.unsubscribeTooltip}
							</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</div>

			<div className="flex justify-between">
				<Button variant="outline" onClick={onBack}>
					{t.Composer.textEditor.backButton}
				</Button>

				<div className="flex gap-2">
					<Button
						variant="outline"
						onClick={handleRegenerate}
						disabled={isRegenerating || isLoading}
					>
						{isRegenerating ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								{t.Composer.textEditor.regenerating}
							</>
						) : (
							t.Composer.textEditor.regenerate
						)}
					</Button>

					<Button onClick={onNext} disabled={isLoading}>
						{t.Composer.textEditor.nextButton}
					</Button>
				</div>
			</div>
		</div>
	);
}
