"use client";

import type React from "react";
import { Controller, useFormContext } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { ChannelThrottleResponse } from "@/lib/actions/channels/get-channel-throttle";

export type ThrottleUnit = "sec" | "min" | "hour" | "day";

interface ChannelThrottleFieldProps {
	defaultThrottle: ChannelThrottleResponse | null;
}

function convertToPerMin(raw: number, unit: ThrottleUnit): number {
	switch (unit) {
		case "sec":
			return raw * 60;

		case "min":
			return raw;

		case "hour":
			return raw / 60;

		case "day":
			return raw / 1440;

		default:
			return raw;
	}
}

function calculateIntervalMs(raw: number, unit: ThrottleUnit): number {
	switch (unit) {
		case "sec":
			return raw > 0 ? 1000 / raw : 1000;

		case "min":
			return raw > 0 ? 60000 / raw : 60000;

		case "hour":
			return raw > 0 ? 3600000 / raw : 3600000;

		case "day":
			return raw > 0 ? 86400000 / raw : 86400000;

		default:
			return 60000;
	}
}

export const ChannelThrottleField: React.FC<ChannelThrottleFieldProps> = ({
	defaultThrottle,
}) => {
	const {
		control,
		watch,
		setValue,
		formState: { errors },
	} = useFormContext();

	const useDefault = watch("useDefaultThrottle");

	return (
		<FormItem>
			<FormLabel>Throttle</FormLabel>

			<div className="flex items-center space-x-2">
				{/* Throttle input */}
				<Controller
					name="throttle"
					control={control}
					render={({ field }) => (
						<Input
							{...field}
							type="number"
							min={1}
							disabled={useDefault}
							onChange={(e) => field.onChange(e.target.valueAsNumber)}
						/>
					)}
				/>

				{/* Throttle unit select */}
				<Controller
					name="throttleUnit"
					control={control}
					defaultValue="min"
					render={({ field }) => (
						<select
							{...field}
							disabled={useDefault}
							className="h-10 rounded border px-2"
						>
							<option value="sec">per sec</option>
							<option value="min">per min</option>
							<option value="hour">per hour</option>
							<option value="day">per day</option>
						</select>
					)}
				/>
			</div>

			{/* Error message */}
			{!useDefault && errors.throttle && (
				<p className="mt-1 text-red-600 text-sm">
					{errors.throttle.message as string}
				</p>
			)}

			{/* Checkbox inline under fields */}
			<div className="mt-2 flex items-center space-x-2 text-sm">
				<Checkbox
					id="use-default-throttle"
					checked={useDefault}
					onCheckedChange={(checked) =>
						setValue("useDefaultThrottle", checked === true)
					}
				/>
				<label
					htmlFor="use-default-throttle"
					className="cursor-pointer select-none"
				>
					Use default throttle{" "}
					{defaultThrottle ? `(${defaultThrottle.throttle} req/min)` : ""}
				</label>
			</div>
		</FormItem>
	);
};

export const throttleUtils = { convertToPerMin, calculateIntervalMs };
