"use client";

import * as React from "react";
import { throttleUtils } from "@/components/ChannelThrottleField";
import {
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import type { ChannelThrottleResponse } from "@/lib/actions/channels/get-channel-throttle";
import {
	SendCompositionForm,
	type SendCompositionFormValues,
} from "./sendCompositionForm";

export default function SendCompositionDialog({
	selectedOption,
	setSelectedOption,
	defaultThrottle,
}: {
	selectedOption: any;
	setSelectedOption: (value: any) => void;
	defaultThrottle: ChannelThrottleResponse | null;
}) {
	async function handleSubmit(values: SendCompositionFormValues) {
		const rawThrottle = values.throttle;
		const throttlePerMin = throttleUtils.convertToPerMin(
			rawThrottle,
			values.throttleUnit,
		);

		console.log("Submitting composition (selected):", {
			...values,
			throttlePerMin, // normalized throttle
		});
	}

	return (
		<div className="rounded-lg border p-6">
			<DialogHeader>
				<DialogTitle>Send Composition</DialogTitle>
				<DialogDescription>
					Send Composition to selected contacts
				</DialogDescription>
			</DialogHeader>

			<SendCompositionForm
				selectedOption={selectedOption}
				setSelectedOption={setSelectedOption}
				defaultThrottle={defaultThrottle}
				onSubmit={handleSubmit}
			/>
		</div>
	);
}
