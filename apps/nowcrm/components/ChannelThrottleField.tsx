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
	let perMin: number;
	switch (unit) {
		case "sec":
			perMin = raw * 60;
			break;
		case "hour":
			perMin = raw / 60;
			break;
		case "day":
			perMin = raw / 1440;
			break;
		default: // "min"
			perMin = raw;
			break;
	}
	return Math.max(Math.ceil(perMin), 1);
}

function calculateIntervalMs(raw: number, unit: ThrottleUnit): number {
	const perMin = convertToPerMin(raw, unit);
	return Math.floor(60000 / perMin);
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
