"use client";

import type { DocumentId } from "@nowcrm/services";
import { debounce } from "lodash";
import {
	AlertTriangle,
	Eye,
	GitBranch,
	Info,
	Mail,
	MessageSquare,
	Send,
	Settings,
	Users,
} from "lucide-react";
import Link from "next/link";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Edge, Node } from "reactflow";
import { AsyncSelect } from "@/components/autoComplete/async-select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RouteConfig } from "@/lib/config/routes-config";
import ContactsPageClient from "../contact-dialog/contacts-data-table";
import { BranchingTab } from "./branching-tab";
import { SendTestDialog } from "./send-test-dialog";

type Condition = {
	id: string;
	type: string;
	operator: string;
	value: string;
	label?: string;
};

type StepConfig = {
	composition: {
		label: string;
		value: string;
	};
	identity: {
		label: string;
		value: string;
	};
	channel: {
		label: string;
		value: string;
	};
	trackConversion: boolean;
	conditions: Condition[];
	condition_type?: "all" | "any";
	fallbackDelay?: number;
	fallbackType?: string;
};

type Branch = {
	id: string;
	sourceNodeId: string;
	targetNodeId: string;
	targetNodeLabel: string;
	label: string;
	conditions: Condition[];
	condition_type: "all" | "any";
	priority: number;
	connectionId: DocumentId; // Store the connection ID for priority updates
};

interface ChannelPanelProps {
	node: Node;
	updateNodeConfig: (config: StepConfig) => void;
	updateNodeLabel: (label: string) => void;
	updateNodeData: (data: Partial<any>) => void;
	onClose?: () => void;
	edges?: Edge[];
	nodes?: Node[];
	updateEdge?: (edgeId: string, data: any) => void;
	onConnectionPrioritiesUpdate?: (
		connectionPriorities: { connectionId: DocumentId; priority: number }[],
	) => Promise<boolean>;
}

const FALLBACK_TYPES = [
	{
		value: "reminder",
		label: "Reminder",
		description: "Send a follow-up reminder",
	},
	{
		value: "alternative",
		label: "Alternative Offer",
		description: "Present a different option",
	},
	{
		value: "final",
		label: "Final Notice",
		description: "Last attempt to engage",
	},
	{
		value: "exit",
		label: "Exit Journey",
		description: "End the customer journey",
	},
];

const CHANNELS_REQUIRING_IDENTITY = [
	"email",
	"linkedin-messaging",
	"linkedin-invitations",
];

export function ChannelPanel({
	node,
	updateNodeConfig,
	updateNodeLabel,
	edges = [],
	nodes = [],
	onConnectionPrioritiesUpdate,
}: ChannelPanelProps) {
	// FIX 2: Reset all state when node changes
	const [config, setConfig] = useState<StepConfig>(() => ({
		composition: node.data.config?.composition || undefined,
		identity: node.data.config?.identity || undefined,
		channel: node.data.config?.channel || undefined,
		trackConversion: node.data.config?.trackConversion || false,
		conditions: node.data.config?.conditions || [],
		condition_type: node.data.config?.condition_type || "all",
		fallbackType: node.data.config?.fallbackType || FALLBACK_TYPES[0].value,
	}));

	const [stepTitle, setStepTitle] = useState(
		() => node.data.label || "New Step",
	);
	const [hasIdentity, setHasIdentity] = useState(
		() => node.data.hasIdentity || false,
	);
	const [branches, setBranches] = useState<Branch[]>([]);
	const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
	// FIX 2: Reset state when node changes
	useEffect(() => {
		console.log("ChannelPanel: Node changed, resetting state", {
			nodeId: node.id,
			nodeData: node.data,
		});

		setStepTitle(node.data.label || "New Step");
		setHasIdentity(node.data.hasIdentity || false);

		setConfig({
			composition: node.data.config?.composition || undefined,
			identity: node.data.config?.identity || undefined,
			channel: node.data.config?.channel || undefined,
			trackConversion: node.data.config?.trackConversion || false,
			conditions: node.data.config?.conditions || [],
			condition_type: node.data.config?.condition_type || "all",
			fallbackType: node.data.config?.fallbackType || FALLBACK_TYPES[0].value,
		});
	}, [node.id]); // Only depend on node.id to trigger reset

	// Load branches from edges and extract connection priorities
	useEffect(() => {
		if (!edges || !nodes) return;

		// Get all edges that have this node as source
		const nodeEdges = edges.filter((edge) => edge.source === node.id);

		// If no edges, clear branches
		if (nodeEdges.length === 0) {
			setBranches([]);
			return;
		}

		// Convert edges to branches with connection priorities
		const branchData = nodeEdges.map((edge) => {
			const targetNode = nodes.find((n) => n.id === edge.target);

			return {
				id: edge.id,
				sourceNodeId: edge.source,
				targetNodeId: edge.target,
				targetNodeLabel: targetNode?.data?.label || "Unknown Step",
				label: (edge.label as string) || "Branch",
				conditions: edge.data?.conditions || [],
				condition_type: edge.data?.condition_type || "all",
				priority: edge.data?.priority || 1, // Get priority from edge data
				connectionId: edge.data?.connectionId, // Store connection ID
			};
		});

		// Sort branches by priority
		branchData.sort((a, b) => a.priority - b.priority);

		setBranches(branchData);
	}, [edges, nodes, node.id]);

	const handleConfigChange = useCallback((newConfig: Partial<StepConfig>) => {
		setConfig((prev) => {
			const updatedConfig = { ...prev, ...newConfig };
			debouncedUpdateNodeConfigRef.current(updatedConfig);
			return updatedConfig;
		});
	}, []);

	// Top of your component (inside ChannelPanel)
	const debouncedUpdateLabelRef = useRef(
		debounce((newTitle: string) => {
			updateNodeLabel(newTitle);
		}, 1000),
	);

	const debouncedUpdateNodeConfigRef = useRef(
		debounce((updatedConfig: StepConfig) => {
			updateNodeConfig(updatedConfig);
		}, 1000),
	);

	// Cancel debounce on unmount
	useEffect(() => {
		return () => {
			debouncedUpdateNodeConfigRef.current.cancel();
			debouncedUpdateLabelRef.current.cancel();
		};
	}, []);

	const handleTitleChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const newTitle = e.target.value;
			setStepTitle(newTitle);
			debouncedUpdateLabelRef.current(newTitle);
		},
		[],
	);

	// Move branch up in priority
	const moveBranchUp = async (branchId: string) => {
		const branchIndex = branches.findIndex((branch) => branch.id === branchId);
		if (branchIndex <= 0) return; // Already at the top

		const newBranches = [...branches];
		const currentBranch = newBranches[branchIndex];
		const aboveBranch = newBranches[branchIndex - 1];

		// Swap priorities
		const tempPriority = currentBranch.priority;
		currentBranch.priority = aboveBranch.priority;
		aboveBranch.priority = tempPriority;

		// Swap positions in array
		[newBranches[branchIndex - 1], newBranches[branchIndex]] = [
			newBranches[branchIndex],
			newBranches[branchIndex - 1],
		];

		// Update UI immediately
		setBranches(newBranches);

		// Prepare connection priority updates
		const connectionPriorityUpdates: {
			connectionId: DocumentId;
			priority: number;
		}[] = [];

		if (currentBranch.connectionId) {
			connectionPriorityUpdates.push({
				connectionId: currentBranch.connectionId,
				priority: currentBranch.priority,
			});
		}
		if (aboveBranch.connectionId) {
			connectionPriorityUpdates.push({
				connectionId: aboveBranch.connectionId,
				priority: aboveBranch.priority,
			});
		}

		// Call the callback if provided
		if (onConnectionPrioritiesUpdate && connectionPriorityUpdates.length > 0) {
			try {
				await onConnectionPrioritiesUpdate(connectionPriorityUpdates);
			} catch (error) {
				console.error("Error updating connection priorities:", error);
				// Revert the UI changes on error
				setBranches(branches);
			}
		}
	};

	// Move branch down in priority
	const moveBranchDown = async (branchId: string) => {
		const branchIndex = branches.findIndex((branch) => branch.id === branchId);
		if (branchIndex === -1 || branchIndex >= branches.length - 1) return; // Already at the bottom

		const newBranches = [...branches];
		const currentBranch = newBranches[branchIndex];
		const belowBranch = newBranches[branchIndex + 1];

		// Swap priorities
		const tempPriority = currentBranch.priority;
		currentBranch.priority = belowBranch.priority;
		belowBranch.priority = tempPriority;

		// Swap positions in array
		[newBranches[branchIndex], newBranches[branchIndex + 1]] = [
			newBranches[branchIndex + 1],
			newBranches[branchIndex],
		];

		// Update UI immediately
		setBranches(newBranches);

		// Prepare connection priority updates
		const connectionPriorityUpdates: {
			connectionId: DocumentId;
			priority: number;
		}[] = [];

		if (currentBranch.connectionId) {
			connectionPriorityUpdates.push({
				connectionId: currentBranch.connectionId,
				priority: currentBranch.priority,
			});
		}
		if (belowBranch.connectionId) {
			connectionPriorityUpdates.push({
				connectionId: belowBranch.connectionId,
				priority: belowBranch.priority,
			});
		}

		// Call the callback if provided
		if (onConnectionPrioritiesUpdate && connectionPriorityUpdates.length > 0) {
			try {
				await onConnectionPrioritiesUpdate(connectionPriorityUpdates);
			} catch (error) {
				console.error("Error updating connection priorities:", error);
				// Revert the UI changes on error
				setBranches(branches);
			}
		}
	};

	// Check if this is the start node
	const isStartNode = node.id === "start" || node.data.label === "Start";

	// Check if this is a fallback node
	const isFallbackNode = node.data.type === "fallback";

	// Check if identity is required for current channel
	const requiresIdentity = CHANNELS_REQUIRING_IDENTITY.includes(
		config.channel?.label?.toLowerCase() || "",
	);
	const getChannelIcon = () => {
		const channelName = config.channel?.label?.toLowerCase();
		if (channelName?.includes("email")) return <Mail className="h-4 w-4" />;
		if (channelName?.includes("sms"))
			return <MessageSquare className="h-4 w-4" />;
		return <MessageSquare className="h-4 w-4" />;
	};

	const getConfigurationStatus = () => {
		const hasChannel = !!config.channel;
		const hasComposition = !!config.composition;
		const hasRequiredIdentity = !requiresIdentity || !!config.identity;

		const completed = [hasChannel, hasComposition, hasRequiredIdentity].filter(
			Boolean,
		).length;
		const total = requiresIdentity ? 3 : 2;

		return { completed, total, isComplete: completed === total };
	};

	const configStatus = getConfigurationStatus();

	return (
		<div className="relative min-h-0 flex-1 overflow-hidden">
			<div className="h-full space-y-6 overflow-y-auto p-6">
				{/* Fallback Node Alert */}
				{isFallbackNode && (
					<Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
						<AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
						<AlertDescription className="text-orange-800 dark:text-orange-200">
							<div className="mb-2 font-medium">Fallback Step</div>
							<p className="text-sm">
								This step will be triggered when contacts don't meet conditions
								to proceed through other paths.
							</p>
						</AlertDescription>
					</Alert>
				)}

				{/* Channel Configuration */}
				<Card>
					<CardHeader className="pb-4">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
									{config.channel ? (
										getChannelIcon()
									) : (
										<MessageSquare className="h-5 w-5 text-primary" />
									)}
								</div>
								<div>
									<CardTitle className="text-lg">
										Channel Configuration
									</CardTitle>
									<CardDescription>
										Configure how messages are sent to your audience
									</CardDescription>
								</div>
							</div>
							<Badge
								variant={configStatus.isComplete ? "default" : "secondary"}
							>
								{configStatus.completed}/{configStatus.total} Complete
							</Badge>
						</div>
					</CardHeader>
					<CardContent className="space-y-6">
						{/* Step Title */}
						<div className="space-y-2">
							<label className="font-medium text-sm" htmlFor="step_title">
								Step Name
							</label>
							<Input
								id="step_title"
								type="text"
								value={stepTitle}
								onChange={handleTitleChange}
								placeholder={isStartNode ? "Start" : "Enter Channel Step Name"}
								disabled={isStartNode}
								className="w-full"
							/>
						</div>

						{/* Fallback Type Selection */}
						{isFallbackNode && (
							<>
								<Separator />
								<Card className="border-orange-200 border-dashed">
									<CardHeader className="pb-3">
										<CardTitle className="flex items-center gap-2 text-base">
											<AlertTriangle className="h-4 w-4 text-orange-500" />
											Fallback Configuration
										</CardTitle>
									</CardHeader>
									<CardContent>
										<div className="space-y-2">
											<label
												className="font-medium text-sm"
												htmlFor="fallback_type"
											>
												Fallback Type
											</label>
											<Select
												value={config.fallbackType || FALLBACK_TYPES[0].value}
												onValueChange={(value) =>
													handleConfigChange({ fallbackType: value })
												}
											>
												<SelectTrigger>
													<SelectValue placeholder="Select fallback type" />
												</SelectTrigger>
												<SelectContent>
													{FALLBACK_TYPES.map((type) => (
														<SelectItem key={type.value} value={type.value}>
															<div>
																<div className="font-medium">{type.label}</div>
																<div className="text-muted-foreground text-xs">
																	{type.description}
																</div>
															</div>
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
									</CardContent>
								</Card>
							</>
						)}

						<Separator />

						{/* Configuration Tabs */}
						<Tabs defaultValue="settings" className="w-full">
							<TabsList className="grid w-full grid-cols-2">
								<TabsTrigger
									value="settings"
									className="flex items-center gap-2"
								>
									<Settings className="h-4 w-4" />
									Settings
								</TabsTrigger>
								<TabsTrigger
									value="conditions"
									className="flex items-center gap-2"
								>
									<GitBranch className="h-4 w-4" />
									Branching
									{branches.length > 0 && (
										<Badge
											variant="secondary"
											className="ml-1 h-5 px-1.5 text-xs"
										>
											{branches.length}
										</Badge>
									)}
								</TabsTrigger>
							</TabsList>

							<TabsContent value="settings" className="mt-6 space-y-6">
								{/* Channel Selection */}
								<Card className="border-dashed">
									<CardHeader className="pb-3">
										<CardTitle className="flex items-center gap-2 text-base">
											<MessageSquare className="h-4 w-4 text-primary" />
											Channel Selection
										</CardTitle>
										<CardDescription>
											Choose how you want to communicate with your audience
										</CardDescription>
									</CardHeader>
									<CardContent>
										<div className="space-y-2">
											<label className="font-medium text-sm" htmlFor="channel">
												Communication Channel
											</label>
											<AsyncSelect
												presetOption={config.channel}
												serviceName="channelsService"
												fetchFilters={{
													$or: [
														{ name: { $eqi: "email" } },
														{ name: { $eqi: "sms" } },
													],
												}}
												onValueChange={(value) => {
													handleConfigChange({ channel: value });
												}}
												useFormClear={false}
												label="channel"
											/>
											{config.channel && (
												<div className="mt-2 flex items-center gap-2">
													{getChannelIcon()}
													<span className="text-muted-foreground text-sm">
														Selected: {config.channel.label}
													</span>
												</div>
											)}
										</div>
									</CardContent>
								</Card>

								{/* Composition Selection */}
								<Card className="border-dashed">
									<CardHeader className="pb-3">
										<CardTitle className="flex items-center gap-2 text-base">
											<Settings className="h-4 w-4 text-primary" />
											Composition
										</CardTitle>
										<CardDescription>
											Select the message template to send
										</CardDescription>
									</CardHeader>
									<CardContent>
										<div className="space-y-2">
											<label
												className="font-medium text-sm"
												htmlFor="composition"
											>
												Message Template
											</label>
											<AsyncSelect
												presetOption={config.composition}
												serviceName="compositionsService"
												onValueChange={(value) =>
													handleConfigChange({ composition: value })
												}
												useFormClear={false}
												label="composition"
											/>
											{config.composition?.label && (
												<div className="mt-3 rounded-lg bg-muted/50 p-3">
													<div className="flex items-center justify-between">
														<div>
															<div className="font-medium text-sm">
																{config.composition.label}
															</div>
														</div>
														<div className="flex items-center gap-2">
															{config.channel?.label
																?.toLowerCase()
																.includes("email") && (
																<Button
																	variant="outline"
																	size="sm"
																	onClick={() => setIsTestDialogOpen(true)}
																	className="flex items-center gap-1"
																>
																	<Send className="h-3 w-3" />
																	Send Test
																</Button>
															)}
															<Button variant="outline" size="sm" asChild>
																<Link
																	href={`${RouteConfig.composer.single(
																		config.composition.value,
																	)}`}
																	target="_blank"
																	rel="noopener noreferrer"
																	className="flex items-center gap-1"
																>
																	<Eye className="h-3 w-3" />
																	Preview
																</Link>
															</Button>
														</div>
													</div>
												</div>
											)}
										</div>
									</CardContent>
								</Card>

								{/* Identity Section - only for specific channels */}
								{requiresIdentity && (
									<Card className="border-amber-200 border-dashed">
										<CardHeader className="pb-3">
											<CardTitle className="flex items-center gap-2 text-base">
												<Users className="h-4 w-4 text-amber-600" />
												Sender Identity
											</CardTitle>
											<CardDescription>
												Required for {config.channel?.label} - Select sender
												identity
											</CardDescription>
										</CardHeader>
										<CardContent>
											<div className="space-y-2">
												<label
													className="font-medium text-sm"
													htmlFor="identity"
												>
													Sender Identity
												</label>
												<AsyncSelect
													presetOption={config.identity}
													serviceName="identitiesService"
													onValueChange={(value) => {
														handleConfigChange({ identity: value });
														setHasIdentity(!!value);
													}}
													useFormClear={false}
													label="identity"
												/>
												<div className="mt-2">
													{hasIdentity ? (
														<div className="flex items-center gap-2 text-green-600 text-sm">
															<div className="h-2 w-2 rounded-full bg-green-500" />
															Identity configured
														</div>
													) : (
														<Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
															<Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
															<AlertDescription className="text-amber-800 text-sm dark:text-amber-200">
																No identity selected. Recipients won't see
																sender information.
															</AlertDescription>
														</Alert>
													)}
												</div>
											</div>
										</CardContent>
									</Card>
								)}

								{/* Contacts Section */}
								<Card className="border-dashed">
									<CardHeader className="pb-3">
										<CardTitle className="flex items-center gap-2 text-base">
											<Users className="h-4 w-4 text-primary" />
											Target Contacts
										</CardTitle>
										<CardDescription>
											Manage contacts for this step
										</CardDescription>
									</CardHeader>
									<CardContent>
										<ContactsPageClient
											key={node.data.stepId}
											step_id={node.data.stepId}
										/>
									</CardContent>
								</Card>
							</TabsContent>

							<TabsContent value="conditions" className="mt-6">
								<BranchingTab
									branches={branches}
									moveBranchUp={moveBranchUp}
									moveBranchDown={moveBranchDown}
								/>
							</TabsContent>
						</Tabs>
					</CardContent>
				</Card>
			</div>
			{config.composition?.value && config.channel?.value && (
				<SendTestDialog
					open={isTestDialogOpen}
					onOpenChange={setIsTestDialogOpen}
					compositionId={config.composition.value}
					channel={
						config.channel.label?.toLowerCase().includes("email")
							? "email"
							: config.channel.label?.toLowerCase() || ""
					}
					channelLabel={config.channel.label}
					from={config.identity?.label}
				/>
			)}
		</div>
	);
}
