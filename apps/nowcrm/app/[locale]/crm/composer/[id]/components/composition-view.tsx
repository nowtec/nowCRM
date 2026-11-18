"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
	CommunicationChannel,
	type CommunicationChannelKeys,
	type Composition,
	type createAdditionalComposition,
	type DocumentId,
	getFileUploadMimeType,
} from "@nowcrm/services";
import { Pencil, Save, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMessages } from "next-intl";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import * as z from "zod";
import { ReturnButton } from "@/components/return-button";
import Spinner from "@/components/spinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	FormControl,
	FormField,
	FormItem,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { updateComposition } from "@/lib/actions/composer/update-composition";
import { delay } from "@/lib/delay";
import { CompositionChannelContent } from "./channels/composition-channel-content";
import { CompositionForm } from "./composition-form";
import { processFormFileOperations } from "./composition-form-submit";
import { CompositionOverview } from "./composition-overview";
import { CompositionSidebar } from "./composition-sidebar";

// Define the form schema with Zod
const formSchema = z.object({
	name: z.string().min(2, {
		message: "Composition name must be at least 2 characters.",
	}),
	subject: z.string().min(1, "Subject is required"),
	category: z.string().optional(),
	language: z.enum(["en", "it", "fr", "de"]),
	persona: z.string().optional(),
	composition_status: z.enum(["Finished", "Pending", "Errored"]),
	model: z.string().optional(),
	reference_prompt: z.string().optional(),
	reference_result: z.string().optional(),
	add_unsubscribe: z.boolean().optional(),
	composition_items: z.array(
		z.object({
			id: z.number().optional(),
			documentId: z.string().optional(),
			additional_prompt: z.string().optional(),
			result: z.string().optional(),
			channel: z.any(), //tempo any untill create function which create zod schemas out of types
			attached_files: z.any().optional(),
			files_to_delete: z.any().optional(),
			new_files: z.any().optional(),
		}),
	),
});

type FormValues = z.infer<typeof formSchema>;

const getCompositionItemsWithChannels = (
	items: Composition["composition_items"] | null | undefined,
) =>
	(items ?? []).filter(
		(item) =>
			typeof item?.channel?.name === "string" && item.channel.name.length > 0,
	);

export function CompositionView({ composition }: { composition: Composition }) {
	const compositionItems = getCompositionItemsWithChannels(
		composition.composition_items,
	);
	const compositionStatus = composition.composition_status ?? "Unknown";

	// Initialize form with the composition data
	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: composition.name,
			subject: composition.subject || "",
			category: composition.category || "",
			language: composition.language || "",
			persona: composition.persona || "",
			composition_status: composition.composition_status || "Finished",
			model: composition.model || undefined,
			add_unsubscribe: composition.add_unsubscribe || false,
			reference_prompt: composition.reference_prompt || "",
			reference_result: composition.reference_result || "",
			composition_items: compositionItems.map((item) => ({
				documentId: item.documentId,
				additional_prompt: item.additional_prompt || "",
				result: item.result,
				channel: item.channel,
				attached_files: item.attached_files || null,
			})),
		},
	});
	const t = useMessages();
	const router = useRouter();
	const [isEditing, setIsEditing] = useState(false);
	const [activeTab, setActiveTab] = useState<string>("overview");
	const [isSaving, setIsSaving] = useState(false);
	const [isAddingChannel, setIsAddingChannel] = useState(false);

	// Get all available channels from the composition items
	const availableChannels = compositionItems.map((item) => item.channel.name);

	// Find composition item by channel name
	const findCompositionItem = (channelName: string) => {
		return compositionItems.find(
			(item) => item.channel.name.toLowerCase() === channelName.toLowerCase(),
		);
	};

	// Create channel tabs based on available channels
	const channelTabs = Object.values(CommunicationChannel)
		.filter((channel) =>
			availableChannels.includes(channel as CommunicationChannelKeys),
		)
		.map((channel) => {
			const item = findCompositionItem(channel as string);
			return {
				id: channel.toLowerCase(),
				label: channel,
				channelName: channel,
				status: ["SMS", "WHATSAPP", "LINKEDIN_INVITATIONS", "EMAIL"].includes(
					channel.toUpperCase(),
				)
					? "None"
					: item?.item_status || "None",
				file_type: item?.channel.file_upload_type || "all",
				text_type: item?.channel.editor_text_type || "text",
				maximum_content_lenght: item?.channel.max_content_lenght || 50000,
				remove_html: item?.channel.removeHtml || false,
			};
		});

	// Find form composition item index by channel name
	const findFormItemIndex = (channelName: string) => {
		return compositionItems.findIndex(
			(item) => item.channel.name.toLowerCase() === channelName.toLowerCase(),
		);
	};

	// Handle tab change with URL hash
	const handleTabChange = (tabId: string) => {
		setActiveTab(tabId);
		// Update URL hash without full navigation
		window.history.pushState(null, "", `#${tabId}`);
	};

	// Initialize active tab from URL hash on component mount
	useEffect(() => {
		const handleHashChange = () => {
			const hash = window.location.hash.replace("#", "");

			// Check if the hash corresponds to a valid tab
			if (hash === "overview") {
				setActiveTab("overview");
				return;
			}

			const isValidTab = channelTabs.some((tab) => tab.id === hash);
			if (hash && isValidTab) {
				setActiveTab(hash);
			} else if (!activeTab || activeTab === "") {
				// Default to overview if no hash or invalid hash
				setActiveTab("overview");
				window.history.pushState(null, "", "#overview");
			}
		};

		// Set initial tab based on URL hash
		handleHashChange();

		// Listen for hash changes (browser back/forward navigation)
		window.addEventListener("hashchange", handleHashChange);

		return () => {
			window.removeEventListener("hashchange", handleHashChange);
		};
	}, [channelTabs]);

	// Modify the onSubmit function to include loading state
	const onSubmit = async (data: FormValues) => {
		setIsSaving(true);
		try {
			const success = await handleCompositionSubmit(
				data,
				composition.documentId,
				router,
				form,
				t.Composer.channelContent.overview.toasts,
			);
			if (success) {
				setIsEditing(false);
			}
		} finally {
			setIsSaving(false);
		}
	};

	const onInvalid = (errors: any) => {
		// Grab the first error message
		const firstError = Object.values(errors)[0] as any;
		const message = firstError?.message || "Please fix the errors in the form";
		toast.error(message);
	};

	const handleRegenerate = async (
		itemId: DocumentId,
		formItemIndex: number,
		data: createAdditionalComposition,
	) => {
		const { regenerateItemResult } = await import(
			"@/lib/actions/composer/composerItems/regenerate-item-result"
		);
		const { updateCompositionItem } = await import(
			"@/lib/actions/composer/composerItems/update-composition-item"
		);
		const rez = await regenerateItemResult(data);
		await updateCompositionItem(itemId, {
			result: rez.data as string,
		});
		// Update the form state directly
		form.setValue(
			`composition_items.${formItemIndex}.result`,
			rez.data as string,
		);

		router.refresh();
		// *** Return the new result so the caller can use it ***
		return rez.data as string;
	};

	const handleCancel = () => {
		form.reset();
		setIsEditing(false);
	};

	const getStatusColor = (status: string | null | undefined) => {
		if (status == null) {
			return "bg-blue-500";
		}

		switch (status.toLowerCase()) {
			case "pending":
				return "bg-yellow-500";
			case "finished":
				return "bg-green-500";
			case "archived":
				return "bg-gray-500";
			case "errored":
				return "bg-red-500";
			default:
				return "bg-blue-500";
		}
	};

	// Add this function to handle adding a new channel
	const handleAddChannel = async (channelName: CommunicationChannelKeys) => {
		try {
			setIsAddingChannel(true);
			const { createCompositionItem } = await import(
				"@/lib/actions/composer/composerItems/create-composition-item"
			);
			await createCompositionItem(composition.documentId, channelName);
			toast.success(
				`${channelName} ${t.Composer.channelContent.overview.toasts.channelAddedSuccess}`,
			);

			// Fetch the updated composition data
			const { getComposition } = await import(
				"@/lib/actions/composer/get-composition"
			);
			const updatedComposition = (await getComposition(composition.documentId))
				.data;

			if (updatedComposition) {
				// Update the form with the new composition data
				const updatedFormValues = {
					name: updatedComposition.name,
					category: updatedComposition.category || "",
					language: updatedComposition.language || "",
					persona: updatedComposition.persona || "",
					composition_status:
						updatedComposition.composition_status || "Finished",
					model: updatedComposition.model || undefined,
					add_unsubscribe: updatedComposition.add_unsubscribe || false,
					reference_prompt: updatedComposition.reference_prompt || "",
					reference_result: updatedComposition.reference_result || "",
					composition_items: getCompositionItemsWithChannels(
						updatedComposition.composition_items,
					).map((item) => ({
						documentId: item.documentId,
						additional_prompt: item.additional_prompt || "",
						result: item.result,
						channel: item.channel,
						attached_files: item.attached_files || null,
					})),
				};
				form.reset(updatedFormValues);
				const newChannelId = channelName.toLowerCase();
				window.history.pushState(null, "", `#${newChannelId}`);
			}
		} catch (error) {
			console.error("Error adding channel:", error);
			toast.error(
				`${t.Composer.channelContent.overview.toasts.channelAddedError} ${channelName}`,
			);
		} finally {
			setIsAddingChannel(false);
			//TODO: small delay helps for correct refresh which will revalidate data -> considered as crutch and not solution
			await delay(500);
			router.refresh();
		}
	};

	// Reset form with the latest composition data whenever composition changes
	useEffect(() => {
		form.reset({
			name: composition.name,
			subject: composition.subject || "",
			category: composition.category || "",
			language: composition.language || "",
			persona: composition.persona || "",
			composition_status: composition.composition_status || "Finished",
			model: composition.model || undefined,
			add_unsubscribe: composition.add_unsubscribe || false,
			reference_prompt: composition.reference_prompt || "",
			reference_result: composition.reference_result || "",
			composition_items: compositionItems.map((item) => ({
				documentId: item.documentId,
				additional_prompt: item.additional_prompt || "",
				result: item.result,
				channel: item.channel,
				attached_files: item.attached_files || null,
			})),
		});
	}, [composition, form]);

	return (
		<div className="container mx-auto max-w-7xl py-6">
			<CompositionForm
				form={form}
				onSubmit={onSubmit}
				onInvalid={onInvalid}
				isEditing={isEditing}
				activeTab={activeTab}
			>
				<div className="mb-6 flex items-center gap-2">
					<ReturnButton />
					<div className="flex flex-1 items-center">
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormControl>
										{isEditing ? (
											<Input
												id="name"
												{...field}
												autoComplete="off"
												placeholder="Enter composition name..."
												className="w-[20rem]"
											/>
										) : (
											<h1 className="font-bold text-3xl">{field.value}</h1>
										)}
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<div className="ml-2 flex items-center">
							<Badge className={getStatusColor(compositionStatus)}>
								{compositionStatus}
							</Badge>
						</div>
					</div>
					{!isEditing ? (
						<Button onClick={() => setIsEditing(true)}>
							<Pencil className="mr-2 h-4 w-4" />
							{t.common.actions.edit}
						</Button>
					) : (
						<div className="flex gap-2">
							<Button type="button" variant="outline" onClick={handleCancel}>
								<X className="mr-2 h-4 w-4" />
								{t.common.actions.cancel}
							</Button>
							<Button type="submit" form="composition-form" disabled={isSaving}>
								{isSaving ? (
									<Spinner size="medium" />
								) : (
									<>
										<Save className="mr-2 h-4 w-4" />
										{t.common.actions.save}
									</>
								)}
							</Button>
						</div>
					)}
				</div>
				<div className="grid grid-cols-1 gap-6 md:grid-cols-4">
					{/* Sidebar Navigation */}
					<CompositionSidebar
						activeTab={activeTab}
						setActiveTab={handleTabChange}
						channelTabs={channelTabs}
						onAddChannel={handleAddChannel}
						isAddingChannel={isAddingChannel}
					/>

					{/* Content Area */}
					<div className="md:col-span-3">
						{activeTab === "overview" ? (
							<CompositionOverview form={form} isEditing={isEditing} />
						) : (
							channelTabs.map((tab) => {
								const compositionItem = findCompositionItem(tab.channelName);
								if (!compositionItem) return null;

								const formItemIndex = findFormItemIndex(tab.channelName);
								const itemId = compositionItem.documentId;
								const files = compositionItem.attached_files;

								return (
									<div
										key={tab.id}
										className={activeTab === tab.id ? "block" : "hidden"}
									>
										<CompositionChannelContent
											tab={tab}
											form={form}
											isEditing={isEditing}
											composition_id={composition.documentId}
											formItemIndex={formItemIndex}
											itemId={itemId}
											onRegenerate={handleRegenerate}
											attached_files={files}
											fileType={getFileUploadMimeType(tab.file_type)}
											textType={tab.text_type as "text" | "html"}
										/>
									</div>
								);
							})
						)}
					</div>
				</div>
			</CompositionForm>
		</div>
	);
}

export async function handleCompositionSubmit(
	data: any,
	compositionId: DocumentId,
	router: any,
	_form: any,
	translation: any,
) {
	try {
		const formData = new FormData();

		const { composition_items, ...composition_data } = data;
		formData.append("composition_data", JSON.stringify(composition_data));
		const itemsForJson = composition_items.map((item: any) => {
			const cleanItem = { ...item };
			if (cleanItem.new_files) cleanItem.new_files = undefined;
			return cleanItem;
		});
		formData.append("composition_items", JSON.stringify(itemsForJson));
		composition_items.forEach((item: any, itemIndex: number) => {
			if (item.new_files && item.new_files.length > 0) {
				item.new_files.forEach((file: File, fileIndex: number) => {
					formData.append(`item_${itemIndex}_file_${fileIndex}`, file);
				});
			}
		});

		await processFormFileOperations(formData);

		await updateComposition(compositionId, composition_data);

		await Promise.all(
			data.composition_items.map(async (item: any) => {
				if (item.documentId) {
					const item_id = item.documentId;
					delete item.documentId;
					delete item.id;
					delete item.channel;
					delete item.files_to_delete;
					delete item.new_files;
					const { updateCompositionItem } = await import(
						"@/lib/actions/composer/composerItems/update-composition-item"
					);
					await updateCompositionItem(item_id, item);
				}
			}),
		);
		toast.success(translation.compositionUpdateSuccess);
		router.refresh();
		return true;
	} catch (error) {
		console.error("Error saving composition:", error);
		toast.error(`${translation.compositionUpdateError} ${error}`);
		return false;
	}
}
