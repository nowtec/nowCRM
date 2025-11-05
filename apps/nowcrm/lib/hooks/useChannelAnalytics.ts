// lib/hooks/useChannelAnalytics.ts
import { format } from "date-fns";
import { useCallback, useEffect, useState } from "react";
import { getEventsByCompositionId } from "@/lib/actions/events/get-event";
import type { DateRange } from "@/lib/types/new_type/composition";

export function useChannelAnalytics(
	compositionItemId: number,
	channelName: string,
) {
	const [selectedRange, setSelectedRange] = useState<DateRange>("total");
	const [customDate, setCustomDate] = useState<Date>();
	const [events, setEvents] = useState<any[]>([]);
	const [isLoading, setIsLoading] = useState<boolean>(false);

	const fetchEvents = useCallback(async () => {
		setIsLoading(true);
		try {
			const pageSize = 100;
			let page = 1;
			let allEvents: any[] = [];

			// TODO: Change to get all events in one call if possible, strapi endpoint might be needed
			while (true) {
				const res = await getEventsByCompositionId(
					compositionItemId,
					channelName,
					page,
					pageSize,
				);
				if (!res.success || !res.data) break;

				allEvents = allEvents.concat(res.data);

				if (res.data.length < pageSize) break;

				page += 1;
			}

			setEvents(
				allEvents.map((e: any) => ({
					...e,
					contact: e.contact ?? null,
				})),
			);
		} catch (err) {
			console.error("useChannelAnalytics.fetchEvents:", err);
		} finally {
			setIsLoading(false);
		}
	}, [compositionItemId, channelName]);

	useEffect(() => {
		fetchEvents();
	}, [fetchEvents, selectedRange, customDate]);

	const filteredEvents = events.filter((e) => {
		const d = new Date((e as any).createdAt);
		const now = new Date();
		switch (selectedRange) {
			case "today":
				return d.toDateString() === now.toDateString();
			case "yesterday": {
				const y = new Date(now);
				y.setDate(now.getDate() - 1);
				return d.toDateString() === y.toDateString();
			}
			case "last7days": {
				const w = new Date(now);
				w.setDate(now.getDate() - 7);
				return d >= w && d <= now;
			}
			case "custom":
				return customDate
					? d.toDateString() === customDate.toDateString()
					: false;
			default:
				return true;
		}
	});

	const dateLabel = (() => {
		if (selectedRange === "total") return "All Time";
		if (selectedRange === "custom" && customDate)
			return format(customDate, "dd/MM/yyyy");
		if (filteredEvents.length)
			return format(new Date(filteredEvents[0].createdAt), "dd/MM/yyyy");
		return format(new Date(), "dd/MM/yyyy");
	})();

	return {
		selectedRange,
		setSelectedRange,
		filteredEvents,
		dateLabel,
		customDate,
		setCustomDate,
		fetchEvents,
		isLoading,
	};
}
