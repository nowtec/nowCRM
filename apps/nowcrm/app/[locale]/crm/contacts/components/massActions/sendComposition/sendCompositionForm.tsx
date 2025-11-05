"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import * as z from "zod";
import { AsyncSelect } from "@/components/autoComplete/AsyncSelect";
import { ChannelContent } from "@/components/ChannelContent";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import type { ChannelThrottleResponse } from "@/lib/actions/channels/get-channel-throttle";
import type { CommunicationChannel } from "@/lib/static/channel-icons";

export const sendCompositionSchema = (
	defaultThrottle: ChannelThrottleResponse | null,
) =>
	z
		.object({
			compositionName: z
				.string()
				.min(2, {
					message: "Composition name must be at least 2 characters.",
				})
				.optional(),
			channel: z.string().optional(),
			composition: z
				.object({
					value: z.string(),
					label: z.string(),
				})
				.optional(),
			identity: z.object({ value: z.string(), label: z.string() }).optional(),
			subject: z.string().min(1, { message: "Subject is required" }),
			throttle: z.number().min(1, { message: "Min 1 request" }),
			throttleUnit: z.enum(["sec", "min", "hour", "day"]),
			useDefaultThrottle: z.boolean(),
			useDefaultIdentity: z.boolean().optional(),
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

export type SendCompositionFormValues = z.infer<
	ReturnType<typeof sendCompositionSchema>
>;

export function SendCompositionForm({
	selectedOption,
	setSelectedOption,
	defaultThrottle,
	onSubmit,
}: {
	selectedOption: any;
	setSelectedOption: (value: any) => void;
	defaultThrottle: ChannelThrottleResponse | null;
	onSubmit: (values: SendCompositionFormValues) => void | Promise<void>;
}) {
	const form = useForm<SendCompositionFormValues>({
		resolver: zodResolver(sendCompositionSchema(defaultThrottle)),
		defaultValues: {
			compositionName: "",
			channel: "",
			composition: selectedOption,
			throttle: defaultThrottle?.throttle ?? 1,
			throttleUnit: "min",
			useDefaultThrottle: defaultThrottle !== null,
			useDefaultIdentity: false,
		},
	});

	const allowedChannels = ["SMS", "Email", "Linkedin_Invitations", "WhatsApp"];
	const selectedChannel = useWatch({ control: form.control, name: "channel" });

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
				{/* Channel */}
				<FormField
					control={form.control}
					name="channel"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Select Channel</FormLabel>
							<FormControl>
								<AsyncSelect
									serviceName="channelService"
									label="channel"
									fetchFilters={{ name: { $in: allowedChannels } }}
									onValueChange={(opt) => {
										field.onChange(opt.label.toLowerCase());
									}}
									useFormClear={false}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				{selectedChannel && (
					<div className="mt-4">
						<ChannelContent
							channel={selectedChannel as Lowercase<CommunicationChannel>}
							mode="mass_actions"
							contacts={selectedOption?.email || ""}
							setSelectedOption={setSelectedOption}
						/>
					</div>
				)}
			</form>
		</Form>
	);
}
