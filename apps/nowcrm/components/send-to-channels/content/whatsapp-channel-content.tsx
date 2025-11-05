"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Info, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import * as z from "zod";
import { AsyncSelectField } from "@/components/autoComplete/asyncSelectField";
import {
	ChannelThrottleField,
	throttleUtils,
} from "@/components/ChannelThrottleField";
import Spinner from "@/components/Spinner";
import { Button } from "@/components/ui/button";
import { DialogClose } from "@/components/ui/dialog";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	type ChannelThrottleResponse,
	getChannelThrottle,
} from "@/lib/actions/channels/get-channel-throttle";
import { getComposition } from "@/lib/actions/composer/get-composition";
import { normalizePhone } from "@/lib/normalizePhone";
import { CommunicationChannel } from "@/lib/static/channel-icons";
import type { CompositionItem } from "@/lib/types/new_type/composition";
import type { sendToChannelsData } from "../sendToChannelType";

export interface WhatsAppChannelContentProps {
	mode?: "composer" | "mass_actions";
	composition_id?: number;
	contacts?: string;
	closeOnSubmit: () => void;
	setSelectedOption?: (opt: sendToChannelsData) => void;
}

export function WhatsAppChannelContent({
	mode = "composer",
	composition_id,
	contacts,
	closeOnSubmit,
	setSelectedOption,
}: WhatsAppChannelContentProps) {
	const isMassAction = mode === "mass_actions";
	const router = useRouter();
	const [activeTab, setActiveTab] = useState("contact");
	const [isLoading, setIsLoading] = useState(false);
	const [isApproved, setIsApproved] = useState(false);
	const [disablePhoneField, setDisablePhoneField] = useState(false);

	const [currentChannel] = useState<CommunicationChannel>(
		CommunicationChannel.WHATSAPP,
	);

	const [defaultThrottle, setDefaultThrottle] =
		useState<ChannelThrottleResponse | null>(null);
	React.useEffect(() => {
		getChannelThrottle(currentChannel.toLowerCase()).then((res) => {
			if (res.success && res.data) {
				const safeThrottle = res.data.throttle > 0 ? res.data.throttle : 20;
				const safeMaxRate =
					res.data.max_sending_rate > 0 ? res.data.max_sending_rate : 1;
				const safeMaxQuota =
					res.data.max_sending_quota > 0 ? res.data.max_sending_quota : 500;

				setDefaultThrottle({
					...res.data,
					throttle: safeThrottle,
					max_sending_rate: safeMaxRate,
					max_sending_quota: safeMaxQuota,
				});

				form.setValue("throttle", safeThrottle);
				form.setValue("useDefaultThrottle", true);
			} else {
				setDefaultThrottle({
					throttle: 20,
					max_sending_rate: 1,
					max_sending_quota: 5000,
				});
			}
		});
	}, [currentChannel]);

	const formSchema = z
		.object({
			composition: z
				.object({
					value: z.number(),
					label: z.string(),
				})
				.optional(),
			contact: z
				.object({
					value: z.number(),
					label: z.string(),
				})
				.optional(),
			phone: z.string().optional(),
			list: z
				.object({
					value: z.number(),
					label: z.string(),
				})
				.optional(),
			organization: z
				.object({
					value: z.number(),
					label: z.string(),
				})
				.optional(),
			useDefaultThrottle: z.boolean().default(false),
			throttle: z
				.number({ required_error: "Throttle is required" })
				.min(20, "Minimal 20"),
			throttleUnit: z.enum(["sec", "min", "hour", "day"]).default("min"),
		})
		.superRefine((data, ctx) => {
			const def = defaultThrottle;
			if (data.useDefaultThrottle || !def) return;

			const { max_sending_rate, max_sending_quota } = def;
			const raw = data.throttle;

			switch (data.throttleUnit) {
				case "sec":
					if (raw > max_sending_rate)
						ctx.addIssue({
							code: z.ZodIssueCode.custom,
							path: ["throttle"],
							message: `Throttle per sec can't exceed ${max_sending_rate}`,
						});
					break;
				case "min":
					if (raw > max_sending_rate * 60)
						ctx.addIssue({
							code: z.ZodIssueCode.custom,
							path: ["throttle"],
							message: `Throttle per min can't exceed ${max_sending_rate * 60}`,
						});
					break;
				case "hour":
					if (raw > max_sending_rate * 3600)
						ctx.addIssue({
							code: z.ZodIssueCode.custom,
							path: ["throttle"],
							message: `Throttle per hour can't exceed ${max_sending_rate * 3600}`,
						});
					if (raw > max_sending_quota)
						ctx.addIssue({
							code: z.ZodIssueCode.custom,
							path: ["throttle"],
							message: `Throttle per hour can't exceed daily quota ${max_sending_quota}`,
						});
					break;
				case "day":
					if (raw > max_sending_quota)
						ctx.addIssue({
							code: z.ZodIssueCode.custom,
							path: ["throttle"],
							message: `Throttle per day can't exceed daily quota ${max_sending_quota}`,
						});
					break;
			}
		});

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			composition: undefined,
			contact: undefined,
			phone: isMassAction ? (contacts ?? "") : "",
			list: undefined,
			organization: undefined,
			useDefaultThrottle: false,
			throttleUnit: "min",
		},
	});

	const selectedContact = form.watch("contact");
	const phoneInput = form.watch("phone");

	useEffect(() => {
		if (phoneInput && selectedContact) {
			form.setValue("contact", undefined);
			form.clearErrors("contact");
		}
	}, [phoneInput, selectedContact, form]);

	useEffect(() => {
		if (selectedContact) {
			form.setValue("phone", "");
			form.clearErrors(["contact", "phone"]);
			setDisablePhoneField(true);
		} else {
			form.clearErrors("contact");
			setDisablePhoneField(false);
		}
	}, [selectedContact, form]);

	useEffect(() => {
		form.clearErrors();
		if (!isMassAction) {
			switch (activeTab) {
				case "contact":
					form.setValue("list", undefined);
					form.setValue("organization", undefined);
					break;
				case "list":
					form.setValue("phone", "");
					form.setValue("contact", undefined);
					form.setValue("organization", undefined);
					break;
				case "organization":
					form.setValue("phone", "");
					form.setValue("contact", undefined);
					form.setValue("list", undefined);
					break;
			}
		}
	}, [activeTab, form, isMassAction]);

	async function onSubmit(values: z.infer<typeof formSchema>) {
		let submissionData: sendToChannelsData | undefined;
		// determine composition ID
		let compId: number;
		let compositionItemId: number | null = null;

		if (isMassAction) {
			if (!values.composition) {
				toast.error("Please select a composition");
				return;
			}
			compId = values.composition.value;
			console.groupCollapsed(
				` Validating composition items for compId=${compId}`,
			);
			console.log("values.composition:", values.composition);
			console.log("compId (raw):", compId, "| typeof compId:", typeof compId);

			try {
				const compRes = await getComposition(compId);
				console.log("getComposition() response:", compRes);
				if (!compRes.success || !compRes.data) {
					toast.error(`Could not find composition ID ${compId}`);
					console.groupEnd();
					return;
				}

				const allItems: CompositionItem[] = compRes.data.composition_items;
				console.log(`All items for compId=${compId}:`, allItems);

				if (!Array.isArray(allItems) || allItems.length === 0) {
					toast.error(
						`No composition items found for composition ID ${compId}`,
					);
					console.groupEnd();
					return;
				}

				const channelRaw = currentChannel;
				const channelLower = channelRaw.toLowerCase();
				console.log(
					`currentChannel raw="${channelRaw}", toLowerCase()="${channelLower}"`,
				);

				const matchingItem = allItems.find((item) => {
					const name = item.channel?.name;
					console.log(` checking item.id=${item.id}, channel.name="${name}"`);
					return name?.toLowerCase() === channelLower;
				});

				if (!matchingItem) {
					const available = allItems
						.map((i) => i.channel?.name)
						.filter(Boolean);
					console.error(
						`No composition item for channel "${channelLower}". Available:`,
						available,
					);
					toast.error(
						`No composition item found for channel "${currentChannel}".`,
					);
					console.groupEnd();
					return;
				}

				compositionItemId = matchingItem.id;
				console.log("Found compositionItemId:", compositionItemId);
				console.groupEnd();
			} catch (err) {
				console.error("Failed to validate composition items:", err);
				toast.error("Failed to validate composition items");
				console.groupEnd();
				return;
			}
		} else {
			if (!composition_id) {
				toast.error("Missing composition_id prop");
				return;
			}
			compId = composition_id;
		}

		const rawThrottle = values.useDefaultThrottle
			? defaultThrottle!.throttle
			: values.throttle!;
		const throttlePerMin = throttleUtils.convertToPerMin(
			rawThrottle,
			values.throttleUnit,
		);
		const intervalMs = throttleUtils.calculateIntervalMs(
			rawThrottle,
			values.throttleUnit,
		);

		// Validate identity selection
		if (!values.useDefaultThrottle && !values.throttle) {
			toast.error("Please select an throttle or enable default throttle.");
			return;
		}

		if (isMassAction) {
			submissionData = {
				composition_id: compId,
				channels: [CommunicationChannel.WHATSAPP.toLowerCase()],
				to: contacts!,
				type: "contact",
				throttle: throttlePerMin,
				interval: intervalMs,
			};
		} else {
			// composer mode
			if (activeTab === "contact") {
				if (!values.contact && !values.phone) {
					toast.error("Contact or phone is required");
					return;
				}
				if (values.contact) {
					submissionData = {
						composition_id: compId,
						channels: [CommunicationChannel.WHATSAPP.toLowerCase()],
						to: Number(values.contact.value),
						type: "contact",
						throttle: throttlePerMin,
						interval: intervalMs,
					};
				} else if (values.phone) {
					const { normalized, isValidPhone, error } = normalizePhone(
						values.phone,
					);
					if (!isValidPhone || !normalized) {
						toast.error(error || "Invalid phone number");
						return;
					}
					submissionData = {
						composition_id: compId,
						channels: [CommunicationChannel.WHATSAPP.toLowerCase()],
						to: normalized,
						type: "contact",
						throttle: throttlePerMin,
						interval: intervalMs,
					};
				}
			} else if (activeTab === "list") {
				if (!values.list) {
					toast.error("List is required");
					return;
				}
				submissionData = {
					composition_id: compId,
					channels: [CommunicationChannel.WHATSAPP.toLowerCase()],
					to: values.list.value,
					type: "list",
					throttle: throttlePerMin,
					interval: intervalMs,
				};
			} else if (activeTab === "organization") {
				if (!values.organization) {
					toast.error("Organization is required");
					return;
				}
				submissionData = {
					composition_id: compId,
					channels: [CommunicationChannel.WHATSAPP.toLowerCase()],
					to: values.organization.value,
					type: "organization",
					throttle: throttlePerMin,
					interval: intervalMs,
				};
			}
		}

		if (submissionData) {
			if (isMassAction) {
				setSelectedOption?.(submissionData);
				setIsApproved(true);
				return;
			}

			// Composer mode: send right away
			try {
				setIsLoading(true);
				const { sendToChannelAction } = await import("../sendToChannelAction");
				const answer = await sendToChannelAction(submissionData);
				if (answer.success) {
					toast.success(
						"The WhatsApp sending process has started. Depending on the number of selected contacts, it may take up to 10–15 minutes.",
					);
					closeOnSubmit?.();
					router.refresh();
				} else {
					toast.error(answer.errorMessage || "Failed to send WhatsApp message");
				}
			} catch (error) {
				toast.error("An error occurred while sending the WhatsApp message");
				console.error(error);
			} finally {
				setIsLoading(false);
			}
		}
	}

	const handleTabChange = (value: string) => {
		setActiveTab(value);
	};

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
				{isMassAction && (
					<AsyncSelectField
						name="composition"
						label="Composition"
						serviceName="compositionService"
						form={form}
						useFormClear={false}
					/>
				)}

				<ChannelThrottleField defaultThrottle={defaultThrottle} />

				{!isMassAction && (
					<Tabs
						defaultValue="contact"
						className="w-full"
						onValueChange={handleTabChange}
					>
						<TabsList className="grid w-full grid-cols-3">
							<TabsTrigger value="contact">Contact</TabsTrigger>
							<TabsTrigger value="list">List</TabsTrigger>
							<TabsTrigger value="organization">Organization</TabsTrigger>
						</TabsList>

						<TabsContent value="contact" className="pt-4">
							<AsyncSelectField
								name="contact"
								label="Select contact"
								serviceName="contactService"
								form={form}
								useFormClear={true}
								filterKey={["first_name", "last_name"]}
								labelBuilder={(item: any) =>
									`${item.first_name} ${item.last_name}`
								}
							/>
							<FormDescription className="mt-1 mb-4">
								Search by name. If not found, enter phone manually below.
							</FormDescription>

							<FormField
								control={form.control}
								name="phone"
								render={({ field }) => (
									<FormItem>
										<FormLabel className="flex items-center gap-1">
											Phone
											<TooltipProvider>
												<Tooltip>
													<TooltipTrigger asChild>
														<span className="cursor-pointer">
															<Info className="h-4 w-4 text-muted-foreground" />
														</span>
													</TooltipTrigger>
													<TooltipContent className="max-w-xs text-left text-sm">
														<p>
															Enter the phone number in international format.
															<br />
															Starts with <code>+</code>, <code>00</code>, or
															country code like <code>41</code>.
															<br />
															No spaces or symbols.
															<br />
															Example: <code>+41XXXXXXXXX</code>
														</p>
													</TooltipContent>
												</Tooltip>
											</TooltipProvider>
										</FormLabel>
										<FormControl>
											<Input
												placeholder="Enter phone..."
												disabled={disablePhoneField}
												{...field}
											/>
										</FormControl>
										<FormDescription>
											{disablePhoneField
												? "Using phone from selected contact."
												: "Enter phone if contact is not found. A new subscriber will be created if needed."}
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
						</TabsContent>

						<TabsContent value="list" className="pt-4">
							<AsyncSelectField
								name="list"
								label="List"
								serviceName="listService"
								form={form}
								useFormClear={false}
							/>
						</TabsContent>

						<TabsContent value="organization" className="pt-4">
							<AsyncSelectField
								name="organization"
								label="Organization"
								serviceName="organizationService"
								form={form}
								useFormClear={false}
							/>
						</TabsContent>
					</Tabs>
				)}

				{isMassAction ? (
					<Button
						type="button"
						onClick={form.handleSubmit(onSubmit)}
						disabled={isLoading || isApproved}
						className="w-full"
					>
						{isApproved ? (
							"Approved"
						) : isLoading ? (
							<Spinner size="small" />
						) : (
							"Approve"
						)}
					</Button>
				) : (
					<DialogClose asChild>
						<Button
							type="button"
							className="w-full"
							onClick={form.handleSubmit(onSubmit)}
							disabled={isLoading}
						>
							{isLoading ? (
								<>
									<Spinner size="small" />
									Sending...
								</>
							) : (
								<>
									<Mail className="mr-2 h-4 w-4" />
									Send WhatsApp
								</>
							)}
						</Button>
					</DialogClose>
				)}
			</form>
		</Form>
	);
}
