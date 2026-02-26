"use client";

import type { DocumentId, Event } from "@nowcrm/services";
import {
	AlertCircle,
	BellOff,
	Link as LinkIcon,
	Loader2,
	MailOpen,
	MousePointerClick,
	Package,
	Send,
	Trash2,
	Upload,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Session } from "next-auth";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { columns } from "@/app/[locale]/crm/contacts/[id]/(tabs)/events/components/columns/event-columns";
import EventsMassActions, {
	setEventsForMassActions,
} from "@/app/[locale]/crm/contacts/[id]/(tabs)/events/components/massActions/mass-actions";
import DataTable from "@/components/dataTable/data-table";
import ErrorMessage from "@/components/error-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { deleteEventsByCompositionItemAction } from "@/lib/actions/events/delete-events-by-composition-item";
import { getEventsByCompositionId } from "@/lib/actions/events/get-event";

interface EventTableProps {
	compositionItemId: DocumentId;
	channelName?: string;
}

interface ActionTab {
	keys: string[];
	label: string;
	icon: any;
}

interface PaginationState {
	page: number;
	pageSize: number;
	pageCount: number;
	total: number;
}

interface TabState {
	events: Event[];
	pagination: PaginationState;
}

const ACTION_TABS: ActionTab[] = [
	{ keys: ["publish"], label: "Publish", icon: Upload },
	{ keys: ["send"], label: "Sent", icon: Send },
	{ keys: ["delivery"], label: "Delivery", icon: Package },
	{ keys: ["open"], label: "Open", icon: MailOpen },
	{ keys: ["click"], label: "Click", icon: MousePointerClick },
	{ keys: ["links"], label: "Links", icon: LinkIcon },
	{ keys: ["permanent bounce"], label: "Hard Bounce", icon: AlertCircle },
	{
		keys: ["transient bounce", "undetermined bounce", "bounce"],
		label: "Soft Bounce",
		icon: AlertCircle,
	},
	{ keys: ["unsubscribe"], label: "Unsubscribe", icon: BellOff },
];

function getLinksData(events: Event[]) {
	const clickEvents = events.filter((e) => e.action?.toLowerCase() === "click");
	const linkCounts: Record<string, number> = {};

	clickEvents.forEach((e: any) => {
		let link: string | undefined;

		if (typeof e.payload === "string") {
			try {
				const parsed = JSON.parse(e.payload);
				if (parsed?.Message) {
					const inner = JSON.parse(parsed.Message);
					link = inner?.click?.link;
				}
			} catch (err) {
				console.warn("[getLinksData]Error parsing payload:", e.payload, err);
			}
		}

		if (typeof e.payload === "object" && e.payload?.click?.link) {
			link = e.payload.click.link;
		}

		if (link) {
			linkCounts[link] = (linkCounts[link] || 0) + 1;
		}
	});

	return Object.entries(linkCounts)
		.map(([link, count]) => ({ link, count }))
		.sort((a, b) => b.count - a.count);
}

const defaultPagination: PaginationState = {
	page: 1,
	pageSize: 10,
	pageCount: 1,
	total: 0,
};

function groupEventsByContact(events: Event[], action: string) {
	const grouped: Record<
		DocumentId,
		{ contact: Event["contact"]; count: number; lastEvent: Event }
	> = {};

	for (const e of events) {
		const contactId = e.contact?.documentId;
		if (!contactId) continue;

		if (!grouped[contactId]) {
			grouped[contactId] = { contact: e.contact, count: 1, lastEvent: e };
		} else {
			grouped[contactId].count++;
			if (
				new Date(e.createdAt || 0).getTime() >
				new Date(grouped[contactId].lastEvent.createdAt || 0).getTime()
			) {
				grouped[contactId].lastEvent = e;
			}
		}
	}

	const countField =
		action.toLowerCase() === "click" ? "click_count" : "open_count";

	return Object.values(grouped).map((v) => ({
		...v.lastEvent,
		[countField]: v.count,
	}));
}

export default function EventTable({
	compositionItemId,
	channelName,
}: EventTableProps) {
	const [session, _setSession] = useState<Session | null>(null);
	const [error, setError] = useState<any>(null);
	const [loading, setLoading] = useState<boolean>(false);
	const [isClearingAll, setIsClearingAll] = useState(false);
	const [activeTab, setActiveTab] = useState<string>(ACTION_TABS[0].keys[0]);
	const [reloadKey, setReloadKey] = useState(0);

	const [tabData, setTabData] = useState<Record<string, TabState>>({});

	const searchParams = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();

	const page = Number(searchParams.get("page") ?? "1");
	const pageSize = Number(searchParams.get("pageSize") ?? "10");

	const handleTabChange = (tabValue: string) => {
		setActiveTab(tabValue);

		const params = new URLSearchParams(searchParams.toString());
		params.set("page", "1");
		router.replace(`${pathname}?${params.toString()}`, { scroll: false });
	};

	const handleClearAllEvents = async () => {
		if (isClearingAll) return;

		const isConfirmed = window.confirm(
			"Delete all events for this composition item? This will remove all event types.",
		);
		if (!isConfirmed) return;

		setIsClearingAll(true);
		setError(null);

		try {
			const response = await deleteEventsByCompositionItemAction(
				compositionItemId,
				channelName,
			);

			setTabData({});
			setEventsForMassActions([]);
			setReloadKey((prev) => prev + 1);

			if (response.success) {
				const deletedCount = response.data?.deletedCount ?? 0;
				toast.success(
					deletedCount > 0
						? `Deleted ${deletedCount} events`
						: "No events to delete",
				);
				return;
			}

			setError(response);
			const result = response.data;
			if (result && result.deletedCount > 0) {
				toast.error(
					`Deleted ${result.deletedCount}/${result.totalCount} events. ${response.errorMessage || ""}`.trim(),
				);
				return;
			}

			toast.error(response.errorMessage || "Failed to clear events");
		} catch (err) {
			console.error("[EventTable] Error clearing events:", err);
			toast.error("Failed to clear events");
		} finally {
			setIsClearingAll(false);
		}
	};

	useEffect(() => {
		const tab = ACTION_TABS.find((t) => t.keys.includes(activeTab));
		if (!tab) return;

		setLoading(true);
		getEventsByCompositionId(
			compositionItemId,
			channelName,
			page,
			pageSize,
			undefined,
			tab.keys,
		)
			.then((res) => {
				if (res.success) {
					const events = res.data ?? [];
					const pagination: PaginationState = res.meta?.pagination ?? {
						...defaultPagination,
						page,
						pageSize,
						total: events.length,
					};

					setTabData((prev) => ({
						...prev,
						[activeTab]: {
							events,
							pagination,
						},
					}));
					setEventsForMassActions(events);
				} else {
					setError(res);
				}
			})
			.catch((err) => {
				console.error("[EventTable] Error fetching:", err);
				setError(err);
			})
			.finally(() => {
				setLoading(false);
			});
	}, [activeTab, compositionItemId, channelName, page, pageSize, reloadKey]);

	const linksData = getLinksData(tabData.click?.events || []);

	return (
		<Card className="mt-8 w-full">
			<CardHeader>
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<CardTitle className="font-semibold text-2xl">Events</CardTitle>
					<Button
						type="button"
						variant="destructive"
						size="sm"
						onClick={handleClearAllEvents}
						disabled={isClearingAll}
					>
						{isClearingAll ? (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						) : (
							<Trash2 className="mr-2 h-4 w-4" />
						)}
						Clear all events
					</Button>
				</div>
			</CardHeader>
			<CardContent>
				{error && <ErrorMessage response={error} />}
				{!loading && (
					<Tabs
						value={activeTab}
						onValueChange={handleTabChange}
						className="w-full"
					>
						<TabsList className="scrollbar-hide flex w-full overflow-x-auto border-b bg-transparent p-0">
							{ACTION_TABS.map((tab) => {
								const Icon = tab.icon;
								return (
									<TabsTrigger
										key={tab.label}
										value={tab.keys[0]}
										className="flex items-center justify-center gap-2 whitespace-nowrap rounded-none border-transparent border-b-2 px-3 py-2 font-medium text-muted-foreground text-sm data-[state=active]:border-primary data-[state=active]:text-primary"
									>
										<Icon className="h-4 w-4" />
										{tab.label}
									</TabsTrigger>
								);
							})}
						</TabsList>

						{ACTION_TABS.map((tab) => {
							if (tab.keys[0] === "links") {
								return (
									<TabsContent key={tab.label} value="links" className="mt-4">
										<div className="w-full overflow-x-auto rounded-md border">
											<Table className="w-full">
												<TableHeader>
													<TableRow>
														<TableHead className="w-3/4">Link</TableHead>
														<TableHead className="w-1/4 text-center">
															Click count
														</TableHead>
													</TableRow>
												</TableHeader>
												<TableBody>
													{linksData.length > 0 ? (
														linksData.map((row, idx) => (
															<TableRow key={idx}>
																<TableCell className="max-w-[500px] truncate">
																	<a
																		href={row.link}
																		target="_blank"
																		rel="noopener noreferrer"
																		className="text-blue-600 underline"
																	>
																		{row.link}
																	</a>
																</TableCell>
																<TableCell className="text-center">
																	{row.count}
																</TableCell>
															</TableRow>
														))
													) : (
														<TableRow>
															<TableCell
																colSpan={2}
																className="text-center text-muted-foreground"
															>
																No clicks
															</TableCell>
														</TableRow>
													)}
												</TableBody>
											</Table>
										</div>
									</TabsContent>
								);
							}

							const tabEvents = tabData[tab.keys[0]]?.events ?? [];
							const tabPagination =
								tabData[tab.keys[0]]?.pagination ?? defaultPagination;
							let processedEvents = tabEvents;

							if (tab.keys[0] === "click") {
								processedEvents = groupEventsByContact(tabEvents, "click");
							} else if (tab.keys[0] === "open") {
								processedEvents = groupEventsByContact(tabEvents, "open");
							}

							return (
								<TabsContent
									key={tab.label}
									value={tab.keys[0]}
									className="mt-4"
								>
									<DataTable
										data={processedEvents}
										columns={(columns as any).filter((c: any) => {
											if (c.accessorKey === "composition") return false;
											if (
												tab.keys[0] !== "click" &&
												c.accessorKey === "click_count"
											)
												return false;
											if (
												tab.keys[0] !== "open" &&
												c.accessorKey === "open_count"
											)
												return false;
											return true;
										})}
										table_name={`events-${tab.label.toLowerCase().replace(" ", "-")}`}
										table_title=""
										mass_actions={EventsMassActions}
										pagination={tabPagination}
										session={session ?? undefined}
										hiddenCreate={true}
										hiddenSearch={true}
										sorting={{ sortBy: "id", sortOrder: "desc" }}
									/>
								</TabsContent>
							);
						})}
					</Tabs>
				)}
			</CardContent>
		</Card>
	);
}
