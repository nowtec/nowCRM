"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
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
	type ChannelThrottleResponse,
	getChannelThrottle,
} from "@/lib/actions/channels/get-channel-throttle";
import { getComposition } from "@/lib/actions/composer/get-composition";
import { getUserIdentity } from "@/lib/actions/identities/getUserIdentity";
import { CommunicationChannel } from "@/lib/static/channel-icons";
import type { CompositionItem } from "@/lib/types/new_type/composition";
import type { sendToChannelsData } from "../sendToChannelType";

export interface EmailChannelContentProps {
	mode: "composer" | "mass_actions";
	composition_id?: number;
	contacts?: string;
	closeOnSubmit: () => void;
	setSelectedOption?: (opt: sendToChannelsData) => void;
}

export function EmailChannelContent({
	mode = "composer",
	composition_id,
	contacts,
	closeOnSubmit,
	setSelectedOption,
}: EmailChannelContentProps) {
	const isMassAction = mode === "mass_actions";
	const router = useRouter();
	const [activeTab, setActiveTab] = useState("contact");
	const [isLoading, setIsLoading] = useState(false);
	const [isApproved, setIsApproved] = useState(false);
	const defaultIdentityOption = useDefaultIdentity();

	const [currentChannel] = useState<CommunicationChannel>(
		CommunicationChannel.EMAIL,
	);

	const [defaultThrottle, setDefaultThrottle] =
		useState<ChannelThrottleResponse | null>(null);

	React.useEffect(() => {
		getChannelThrottle(currentChannel.toLowerCase()).then((res) => {
			if (res.success && res.data) {
				const safeThrottle = res.data.throttle > 0 ? res.data.throttle : 30;
				const safeMaxRate =
					res.data.max_sending_rate > 0 ? res.data.max_sending_rate : 1;
				const safeMaxQuota =
					res.data.max_sending_quota > 0 ? res.data.max_sending_quota : 10000;

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
					throttle: 30,
					max_sending_rate: 1,
					max_sending_quota: 10000,
				});
			}
		});
	}, [currentChannel]);

	const formSchema = z
		.object({
			composition: z
				.object({ value: z.number(), label: z.string() })
				.optional(),
			email: z.string().optional(),
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
			useDefaultIdentity: z.boolean().default(false),
			useDefaultThrottle: z.boolean().default(false).optional(),
			throttle: z
				.number({ required_error: "Throttle is required" })
				.min(30, "Minimal 30")
				.optional(),
			throttleUnit: z
				.enum(["sec", "min", "hour", "day"])
				.default("min")
				.optional(),
			identity: z
				.object({
					value: z.union([z.number(), z.string()]),
					label: z.string(),
				})
				.optional(),
		})
		.superRefine((data, ctx) => {
			const def = defaultThrottle;
			if (!data.useDefaultThrottle && def) {
				const raw = data.throttle as any;
				const { max_sending_rate, max_sending_quota } = def;

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
			}
		});

	function useDefaultIdentity() {
		const [identity, setIdentity] = useState<string | null>(null);

		React.useEffect(() => {
			getUserIdentity().then((res) => setIdentity(res.data as string));
		}, []);

		return React.useMemo(
			() => (identity ? { label: identity, value: identity } : undefined),
			[identity],
		);
	}

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		context: { defaultThrottle },
		defaultValues: {
			composition: undefined,
			email: isMassAction ? (contacts ?? "") : "",
			list: undefined,
			organization: undefined,
			useDefaultIdentity: false,
			useDefaultThrottle: false,
			throttleUnit: "min",
			identity: undefined,
		},
	});

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

		const composition = await getComposition(compId);
		if (!composition.success || !composition.data) {
			toast.error(`Could not find Composition - ${composition.errorMessage}`);
			return;
		}

		const rawThrottle = values.useDefaultThrottle
			? defaultThrottle!.throttle
			: values.throttle!;
		const throttlePerMin = throttleUtils.convertToPerMin(
			rawThrottle,
			values.throttleUnit as any,
		);
		const intervalMs = throttleUtils.calculateIntervalMs(
			rawThrottle,
			values.throttleUnit as any,
		);

		if (!values.useDefaultIdentity && !values.identity) {
			toast.error("Please select an identity or enable default identity.");
			return;
		}

		// Validate identity selection
		if (!values.useDefaultThrottle && !values.throttle) {
			toast.error("Please select a throttle or enable default throttle.");
			return;
		}
		if (isMassAction) {
			submissionData = {
				composition_id: compId,
				channels: [CommunicationChannel.EMAIL.toLowerCase()],
				to: contacts!,
				type: "contact",
				throttle: throttlePerMin,
				interval: intervalMs,
				subject: composition.data.subject,
				from: values.useDefaultIdentity
					? defaultIdentityOption?.label
					: values.identity?.label,
			};
		} else {
			if (activeTab === "contact") {
				if (!values.email) {
					toast.error("Email is required");
					return;
				}
				submissionData = {
					composition_id: compId,
					channels: [CommunicationChannel.EMAIL.toLowerCase()],
					to: values.email,
					type: "contact",
					throttle: throttlePerMin,
					interval: intervalMs,
					subject: composition.data.subject,
					from: values.useDefaultIdentity
						? defaultIdentityOption?.label
						: values.identity?.label,
				};
			} else if (activeTab === "list") {
				if (!values.list) {
					toast.error("List is required");
					return;
				}
				submissionData = {
					composition_id: compId,
					channels: [CommunicationChannel.EMAIL.toLowerCase()],
					to: values.list.value,
					type: "list",
					interval: intervalMs,
					subject: composition.data.subject,
					from: values.useDefaultIdentity
						? defaultIdentityOption?.label
						: values.identity?.label,
				};
			} else if (activeTab === "organization") {
				if (!values.organization) {
					toast.error("Organization is required");
					return;
				}
				submissionData = {
					composition_id: compId,
					channels: [CommunicationChannel.EMAIL.toLowerCase()],
					to: values.organization.value,
					type: "organization",
					interval: intervalMs,
					subject: composition.data.subject,
					from: values.useDefaultIdentity
						? defaultIdentityOption?.label
						: values.identity?.label,
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
				console.log(answer);

				if (answer.success) {
					toast.success(answer.errorMessage as string);
					closeOnSubmit?.();
					router.refresh();
				} else {
					toast.error(answer.errorMessage || "Failed to send email");
				}
			} catch (error) {
				toast.error("An error occurred while sending the email");
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

				{!form.watch("useDefaultIdentity") && (
					<AsyncSelectField
						name="identity"
						label="Identity"
						serviceName="identityService"
						form={form}
						useFormClear={false}
						showDefaultCheckbox={true}
						defaultOption={defaultIdentityOption}
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
							<FormField
								control={form.control}
								name="email"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Contact email</FormLabel>
										<FormControl>
											<Input
												placeholder="Enter contact email..."
												{...field}
												type="email"
											/>
										</FormControl>
										<FormDescription>
											If the contact is not found in the CRM, it will be created
											and registered as a subscriber.
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
									Send email
								</>
							)}
						</Button>
					</DialogClose>
				)}
			</form>
		</Form>
	);
}
