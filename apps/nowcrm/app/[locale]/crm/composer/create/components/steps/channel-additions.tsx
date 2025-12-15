"use client";

import type { DocumentId } from "@nowcrm/services";
import { HelpCircle, Loader2 } from "lucide-react";
import { useMessages } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { getChannelIcon } from "@/lib/static/channel-icons";
import { cn } from "@/lib/utils";
export interface ChannelCustomization {
	channel: string;
	additional_prompt: string;
	selected: boolean;
}

interface ChannelAdditionsProps {
	onSubmit: (customizations: ChannelCustomization[]) => void;
	onBack: () => void;
	channels: { value: string; label: string }[];
	initialChannelCustomizations?: ChannelCustomization[];
	mainChannel?: DocumentId;
}

export default function ChannelAdditions({
	onSubmit,
	onBack,
	channels,
	initialChannelCustomizations = [],
	mainChannel,
}: ChannelAdditionsProps) {
	const t = useMessages();
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Filter out the main channel
	const availableChannels = channels.filter(
		(ch) => ch.value !== mainChannel?.toString(),
	);

	// Use local state instead of form state for simplicity
	const [customizations, setCustomizations] = useState<ChannelCustomization[]>(
		() => {
			// Create a map of initial customizations by channel for easy lookup
			const initialCustomizationsMap = new Map(
				initialChannelCustomizations.map((item) => [item.channel, item]),
			);

			// Create customizations for all available channels, preserving any initial values
			return availableChannels.map((channel) => {
				const existingCustomization = initialCustomizationsMap.get(
					channel.value,
				);

				if (existingCustomization) {
					return existingCustomization;
				}

				return {
					channel: channel.value,
					additional_prompt: "",
					selected: false,
				};
			});
		},
	);

	// Toggle selection for a channel
	const toggleSelection = (index: number) => {
		console.log("Toggling selection for index:", index);

		setCustomizations((prev) => {
			const updated = [...prev];
			updated[index] = {
				...updated[index],
				selected: !updated[index].selected,
			};
			console.log("Updated customizations:", updated);
			return updated;
		});
	};

	// Update prompt text for a channel
	const updatePrompt = (index: number, text: string) => {
		setCustomizations((prev) => {
			const updated = [...prev];
			updated[index] = {
				...updated[index],
				additional_prompt: text,
			};
			return updated;
		});
	};

	// Handle form submission
	const handleSubmit = () => {
		setIsSubmitting(true);
		try {
			// Only submit selected customizations
			const selectedCustomizations = customizations.filter(
				(item) => item.selected,
			);

			// Call the onSubmit handler with the selected customizations
			onSubmit(selectedCustomizations);
		} catch (error) {
			console.error("Error submitting customizations:", error);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div>
			<h2 className="mb-6 font-bold text-2xl">
				{t.Composer.channelAdditions.title}
			</h2>

			<p className="mb-4 text-muted-foreground">
				{t.Composer.channelAdditions.description}
			</p>

			<div className="space-y-6">
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					{customizations.map((customization, index) => {
						const channelInfo = channels.find(
							(ch) => ch.value === customization.channel,
						);
						const ChannelIcon = channelInfo
							? getChannelIcon(channelInfo.label)
							: null;

						return (
							<div key={customization.channel}>
								<Card
									className={cn(
										"border-2 transition-all",
										customization.selected
											? "border-primary ring-2 ring-primary/20"
											: "border-muted",
									)}
								>
									<CardHeader
										className="flex cursor-pointer flex-row items-center justify-between pb-2"
										onClick={() => toggleSelection(index)}
									>
										<div className="flex items-center gap-2">
											{ChannelIcon && <ChannelIcon className="h-5 w-5" />}
											<div className="flex flex-col">
												<span className="font-medium">
													{channelInfo?.label}
												</span>
												<span className="text-muted-foreground text-xs">
													{customization.selected
														? t.Composer.channelAdditions.included
														: t.Composer.channelAdditions.clickToInclude}
												</span>
											</div>
										</div>
									</CardHeader>
									<CardContent>
										<div className="space-y-2">
											<div className="flex items-center gap-2">
												<p className="font-medium text-sm">
													{t.Composer.channelAdditions.additionalPrompt}
												</p>
												<TooltipProvider>
													<Tooltip>
														<TooltipTrigger asChild>
															<div className="cursor-help">
																<HelpCircle className="h-4 w-4 text-muted-foreground" />
															</div>
														</TooltipTrigger>
														<TooltipContent className="w-80 p-2">
															<p className="mb-1 font-medium">
																{t.Composer.channelAdditions.tooltip}
															</p>
														</TooltipContent>
													</Tooltip>
												</TooltipProvider>
											</div>
											<Textarea
												value={customization.additional_prompt}
												onChange={(e) => updatePrompt(index, e.target.value)}
												placeholder={
													t.Composer.channelAdditions.textareaPlaceholder
												}
												rows={2}
												disabled={isSubmitting || !customization.selected}
												className={cn(
													!customization.selected &&
														"bg-muted text-muted-foreground",
												)}
											/>
										</div>
									</CardContent>
								</Card>
							</div>
						);
					})}
				</div>

				<div className="flex justify-between">
					<Button
						type="button"
						variant="outline"
						onClick={onBack}
						disabled={isSubmitting}
					>
						{t.Composer.channelAdditions.backButton}
					</Button>

					<Button onClick={handleSubmit} disabled={isSubmitting}>
						{isSubmitting ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								{t.Composer.channelAdditions.submitting}
							</>
						) : (
							t.Composer.channelAdditions.nextButton
						)}
					</Button>
				</div>
			</div>
		</div>
	);
}
