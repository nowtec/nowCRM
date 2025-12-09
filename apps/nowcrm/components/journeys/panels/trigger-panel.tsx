"use client";
import type { DocumentId } from "@nowcrm/services";
import { debounce } from "lodash";
import {
	AlertTriangle,
	Check,
	ChevronLeft,
	ChevronRight,
	Contact,
	CreditCardIcon,
	FormInputIcon,
	Mail,
	Power,
	PowerOff,
	Settings,
	Zap,
} from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type TriggerEntity =
	| "contact"
	| "action"
	| "survey"
	| "subscription"
	| "donation-transaction";

export type EventValue = "entry.create" | "entry.update" | "entry.unpublish";

// LabeledValue is used to store the attribute name and value for the trigger.
type LabeledValue = {
	label: string;
	value: string | boolean | number;
	attribute_name?: string;
	operator?: "gt" | "lt" | "eq"; // greater than, less than, equal
};

type TriggerConfig = {
	enabled?: boolean;
	entity?: TriggerEntity | null;
	attribute?: LabeledValue | null;
	event?: EventValue | null;
};

interface TriggerPanelProps {
	node: Node;
	updateNodeConfig: (config: any) => void;
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

type EventOption = {
	value: EventValue;
	label: string;
	description: string;
	// For presets like subscription Activated/Deactivated
	presetAttribute?: LabeledValue;
};

type EntityOption = {
	value: TriggerEntity;
	label: string;
	description: string;
	icon: React.ComponentType<{ className?: string }>;
	event_options: EventOption[];
};

const ENTITY_OPTIONS: EntityOption[] = [
	{
		value: "contact",
		label: "Contact",
		description: "Monitor contact-related events and changes",
		icon: Contact,
		event_options: [
			{
				value: "entry.create",
				label: "Entry Created",
				description: "When a new entry is created",
			},
			{
				value: "entry.update",
				label: "Entry Updated",
				description: "When an existing entry is modified",
			},
			{
				value: "entry.unpublish",
				label: "Entry Unpublished",
				description: "When an entry is unpublished",
			},
		],
	},
	{
		value: "action",
		label: "Action",
		description: "Monitor specific action types and their events",
		icon: Zap,
		event_options: [
			{
				value: "entry.create",
				label: "Entry Created",
				description: "When a new entry is created",
			},
			{
				value: "entry.update",
				label: "Entry Updated",
				description: "When an existing entry is modified",
			},
			{
				value: "entry.unpublish",
				label: "Entry Unpublished",
				description: "When an entry is unpublished",
			},
		],
	},
	{
		value: "survey",
		label: "Form submission",
		description: "Monitor form submissions",
		icon: FormInputIcon,
		event_options: [
			{
				value: "entry.create",
				label: "Form submitted",
				description: "When a new entry is created",
			},
		],
	},
	{
		value: "donation-transaction",
		label: "Donation Transaction",
		description: "Monitor donation transactions",
		icon: CreditCardIcon,
		event_options: [
			{
				value: "entry.create",
				label: "Donation Transaction Created",
				description: "When a new donation transaction is created",
			},
			{
				value: "entry.create",
				label: "Donation Amount",
				description: "When donation amount matches the specified condition",
				presetAttribute: {
					label: "amount",
					value: 0,
					attribute_name: "amount",
					operator: "gt",
				},
			},
		],
	},
	{
		value: "subscription",
		label: "Contact subscription",
		description: "Monitor contact subscriptions",
		icon: Mail,
		event_options: [
			{
				value: "entry.create",
				label: "Subscribed",
				description: "When contact gets new subscription",
			},
			{
				value: "entry.update",
				label: "Activated subscription",
				description: "When a contact activates existing subscription",
				presetAttribute: { label: "active", value: true },
			},
			{
				value: "entry.update",
				label: "Deactivated subscription",
				description: "When contact deactivates existing subscription",
				presetAttribute: { label: "active", value: false },
			},
		],
	},
];

// Helper to read current entity meta
function getEntityMeta(entity?: TriggerEntity | null) {
	return ENTITY_OPTIONS.find((o) => o.value === entity);
}

export function TriggerPanel({
	node,
	updateNodeConfig,
	updateNodeLabel,
}: TriggerPanelProps) {
	const [config, setConfig] = useState<TriggerConfig>(() => ({
		entity: node.data.config?.entity || null,
		attribute: node.data.config?.attribute || null,
		event: node.data.config?.event || null,
		enabled: node.data.config?.enabled !== false,
	}));

	const [stepTitle, setStepTitle] = useState(
		() => node.data.label || (node.data.isStart ? "Start" : "Trigger"),
	);
	const [currentStep, setCurrentStep] = useState<1 | 2>(1);

	const isStartNode = node.id === "start" || node.data.label === "Start";

	useEffect(() => {
		setStepTitle(node.data.label || (node.data.isStart ? "Start" : "Trigger"));
		setConfig({
			entity: node.data.config?.entity || null,
			attribute: node.data.config?.attribute || null,
			event: node.data.config?.event || null,
			enabled: node.data.config?.enabled !== false,
		});

		if (node.data.config?.entity) setCurrentStep(2);
		else setCurrentStep(1);
	}, [node.id, node.data.config, node.data.isStart, node.data.label]);

	const debouncedUpdateNodeConfigRef = useRef(
		debounce((updatedConfig: TriggerConfig) => {
			updateNodeConfig(updatedConfig);
		}, 300),
	);

	const debouncedUpdateLabelRef = useRef(
		debounce((newTitle: string) => {
			updateNodeLabel(newTitle);
		}, 300),
	);

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
			if (!isStartNode) debouncedUpdateLabelRef.current(newTitle);
		},
		[isStartNode],
	);

	const handleConfigChange = useCallback(
		(newConfig: Partial<TriggerConfig>) => {
			setConfig((prev) => {
				const updatedConfig = { ...prev, ...newConfig };
				debouncedUpdateNodeConfigRef.current(updatedConfig);
				return updatedConfig;
			});
		},
		[],
	);

	const handleEntitySelection = useCallback(
		(entity: TriggerEntity) => {
			handleConfigChange({
				entity,
				attribute: config.attribute ? config.attribute : null,
				// Reset event on entity change
				event: null,
			});
			setCurrentStep(2);
		},
		[handleConfigChange, config.attribute],
	);

	const handleBackToStep1 = useCallback(() => {
		setCurrentStep(1);
		handleConfigChange({ attribute: undefined });
	}, []);

	// Event options for selected entity
	const selectedEntityMeta = getEntityMeta(config.entity || undefined);
	const selectedEventOptions = selectedEntityMeta?.event_options ?? [];

	// Ensure selected event is valid for the chosen entity
	useEffect(() => {
		if (
			config.event &&
			!selectedEventOptions.some((e) => e.value === config.event)
		) {
			handleConfigChange({ event: null });
		}
	}, [config.entity, config.event, selectedEventOptions, handleConfigChange]);

	const isConfigurationComplete =
		!!config.entity &&
		!!config.event &&
		// Only require attribute when entity is action
		(config.entity !== "action" || !!config.attribute) &&
		// For donation-transaction with operator, require valid amount value
		(config.entity !== "donation-transaction" ||
			!config.attribute?.operator ||
			(typeof config.attribute.value === "number" &&
				config.attribute.value >= 0));

	const getProgressValue = () => {
		if (currentStep === 1) return config.entity ? 50 : 25;
		return isConfigurationComplete ? 100 : 75;
	};

	const selectedEntityLabel = selectedEntityMeta?.label ?? config.entity;

	// Human friendly rendering for the chosen event
	const renderEventSummary = (ev?: EventValue | null) => {
		if (!ev) return "";
		return ev;
	};

	// When an event is selected, apply any presetAttribute into config.attribute.
	const onEventChange = (value: string) => {
		// Find by label since subscription and donation-transaction options may have same event value
		const selected = selectedEventOptions.find(
			(e) => e.label === value || e.value === value,
		);
		const updates: Partial<TriggerConfig> = { event: selected?.value ?? null };

		// For presets, set attribute here
		if (selected?.presetAttribute) {
			updates.attribute = selected.presetAttribute;
		} else {
			// If entity is not action and the selected event has no preset, do not overwrite
			// existing attribute. This keeps AsyncSelect selection for action and survey.
			if (
				config.entity === "subscription" ||
				config.entity === "donation-transaction"
			) {
				// For subscription or donation-transaction with no preset, attribute should be null
				updates.attribute = null;
			}
		}

		handleConfigChange(updates);
	};

	return (
		<div className="relative min-h-0 flex-1 overflow-hidden">
			<div className="h-full space-y-6 overflow-y-auto p-6">
				{/* Status Alert */}
				<Alert
					className={cn(
						isStartNode
							? "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950"
							: config.enabled
								? "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950"
								: "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950",
					)}
				>
					{isStartNode ? (
						<Zap className="h-4 w-4 text-amber-600 dark:text-amber-400" />
					) : config.enabled ? (
						<Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
					) : (
						<AlertTriangle className="h-4 w-4 text-gray-600 dark:text-gray-400" />
					)}
					<AlertDescription
						className={cn(
							isStartNode
								? "text-amber-800 dark:text-amber-200"
								: config.enabled
									? "text-blue-800 dark:text-blue-200"
									: "text-gray-800 dark:text-gray-200",
						)}
					>
						{isStartNode
							? "This is the primary entry point for your journey. It is always active and cannot be disabled."
							: config.enabled
								? "This trigger is active and will start the journey when conditions are met."
								: "This trigger is disabled and will not start the journey."}
					</AlertDescription>
				</Alert>

				{/* Trigger Configuration */}
				<Card>
					<CardHeader className="pb-4">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
									<Settings className="h-5 w-5 text-primary" />
								</div>
								<div>
									<CardTitle className="text-lg">
										{isStartNode ? "Primary Trigger" : "Secondary Trigger"}
									</CardTitle>
									<CardDescription>
										{isStartNode
											? "Main entry point"
											: "Additional trigger condition"}
									</CardDescription>
								</div>
							</div>
							<Badge variant={config.enabled ? "default" : "secondary"}>
								{config.enabled ? "Active" : "Inactive"}
							</Badge>
						</div>
					</CardHeader>
					<CardContent className="space-y-6">
						{/* Trigger Name */}
						<div className="space-y-2">
							<label className="font-medium text-sm" htmlFor="step_title">
								Trigger Name
							</label>
							<Input
								id="step_title"
								type="text"
								value={stepTitle}
								onChange={handleTitleChange}
								placeholder={isStartNode ? "Start" : "Enter Trigger Name"}
								disabled={isStartNode}
								className="w-full"
							/>
						</div>

						{!isStartNode && (
							<>
								<Separator />
								{/* Enable or Disable */}
								<div className="flex items-center justify-between">
									<div className="space-y-1">
										<label className="font-medium text-sm">
											Trigger Status
										</label>
										<p className="text-muted-foreground text-xs">
											Enable or disable this trigger. Only one trigger can be
											active at a time.
										</p>
									</div>
									<div className="flex items-center gap-2">
										{config.enabled ? (
											<Power className="h-4 w-4 text-green-500" />
										) : (
											<PowerOff className="h-4 w-4 text-gray-500" />
										)}
										<Switch
											checked={config.enabled}
											onCheckedChange={(enabled) =>
												handleConfigChange({ enabled })
											}
										/>
									</div>
								</div>
							</>
						)}

						{(config.enabled || isStartNode) && (
							<>
								<Separator />
								{/* Progress */}
								<div className="space-y-3">
									<div className="flex items-center justify-between">
										<label className="font-medium text-sm">
											Configuration Progress
										</label>
										<span className="text-muted-foreground text-xs">
											Step {currentStep} of 2
										</span>
									</div>
									<Progress value={getProgressValue()} className="h-2" />
									<div className="flex justify-between text-muted-foreground text-xs">
										<span
											className={cn(
												"flex items-center gap-1",
												config.entity && "font-medium text-primary",
											)}
										>
											{config.entity && <Check className="h-3 w-3" />}
											Choose Entity
										</span>
										<span
											className={cn(
												"flex items-center gap-1",
												isConfigurationComplete && "font-medium text-primary",
											)}
										>
											{isConfigurationComplete && <Check className="h-3 w-3" />}
											Configure Event
										</span>
									</div>
								</div>

								<Separator />

								{/* Steps */}
								<div
									className={cn(
										"space-y-6",
										!config.enabled &&
											!isStartNode &&
											"pointer-events-none opacity-50",
									)}
								>
									{/* Step 1 */}
									{currentStep === 1 && (
										<Card className="border-dashed">
											<CardHeader className="pb-3">
												<CardTitle className="flex items-center gap-2 text-base">
													<span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground text-xs">
														1
													</span>
													Choose Entity Type
												</CardTitle>
												<CardDescription>
													Select whether this trigger should monitor contacts,
													actions, or forms.
												</CardDescription>
											</CardHeader>
											<CardContent className="space-y-3">
												{ENTITY_OPTIONS.map((option) => (
													<button
														type="button"
														key={option.value}
														onClick={() => handleEntitySelection(option.value)}
														className={cn(
															"flex w-full items-center gap-4 rounded-lg border-2 p-4 text-left transition-all hover:shadow-sm",
															config.entity === option.value
																? "border-primary bg-primary/5 shadow-sm"
																: "border-border hover:border-primary/50",
														)}
													>
														<option.icon className="h-6 w-6 text-primary" />
														<div className="flex-1">
															<div className="font-medium text-base">
																{option.label}
															</div>
															<div className="mt-1 text-muted-foreground text-sm">
																{option.description}
															</div>
														</div>
														<ChevronRight className="h-5 w-5 text-muted-foreground" />
													</button>
												))}

												{config.entity && (
													<Button
														onClick={() => setCurrentStep(2)}
														className="mt-4 w-full"
													>
														Continue to Event Configuration
														<ChevronRight className="ml-2 h-4 w-4" />
													</Button>
												)}
											</CardContent>
										</Card>
									)}

									{/* Step 2 */}
									{currentStep === 2 && (
										<Card className="border-dashed">
											<CardHeader className="pb-3">
												<div className="flex items-center justify-between">
													<CardTitle className="flex items-center gap-2 text-base">
														<span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground text-xs">
															2
														</span>
														Configure Event
													</CardTitle>
													<Button
														variant="ghost"
														size="sm"
														onClick={handleBackToStep1}
														className="h-8 px-2"
													>
														<ChevronLeft className="mr-1 h-4 w-4" />
														Back
													</Button>
												</div>
												<CardDescription>
													Selected entity:{" "}
													<Badge variant="outline">{selectedEntityLabel}</Badge>
												</CardDescription>
											</CardHeader>
											<CardContent className="space-y-4">
												{/* Action Type only for actions */}
												{config.entity === "action" && (
													<div className="space-y-2">
														<label className="font-medium text-sm">
															Action Type
														</label>
														<AsyncSelect
															presetOption={config.attribute as any}
															serviceName="actionTypeService"
															onValueChange={(val) =>
																handleConfigChange({
																	attribute: {
																		label: val.label,
																		attribute_name: "action_type.name",
																		value: val.value,
																	},
																})
															}
															useFormClear={false}
															label="action type"
														/>
														<p className="text-muted-foreground text-xs">
															Choose the specific action type to monitor for
															events
														</p>
													</div>
												)}

												{config.entity === "survey" && (
													<div className="space-y-2">
														<label className="font-medium text-sm">
															Survey
														</label>
														<AsyncSelect
															presetOption={config.attribute as any}
															serviceName="formsService"
															onValueChange={(val) =>
																handleConfigChange({
																	attribute: {
																		label: val.label,
																		attribute_name: "form_id",
																		value: val.value,
																	},
																})
															}
															useFormClear={false}
															label="survey"
														/>
														<p className="text-muted-foreground text-xs">
															Choose the specific form to monitor for events
														</p>
													</div>
												)}

												{config.entity === "donation-transaction" &&
													config.attribute?.operator && (
														<div className="space-y-4">
															<div className="space-y-2">
																<label className="font-medium text-sm">
																	Comparison Operator
																</label>
																<Select
																	value={config.attribute.operator}
																	onValueChange={(
																		operator: "gt" | "lt" | "eq",
																	) =>
																		handleConfigChange({
																			attribute: {
																				label:
																					config.attribute?.label ?? "amount",
																				value: config.attribute?.value ?? 0,
																				attribute_name:
																					config.attribute?.attribute_name ??
																					"amount",
																				operator,
																			},
																		})
																	}
																>
																	<SelectTrigger>
																		<SelectValue placeholder="Select operator" />
																	</SelectTrigger>
																	<SelectContent>
																		<SelectItem value="gt">
																			Greater Than (&gt;)
																		</SelectItem>
																		<SelectItem value="lt">
																			Less Than (&lt;)
																		</SelectItem>
																		<SelectItem value="eq">
																			Equal (=)
																		</SelectItem>
																	</SelectContent>
																</Select>
																<p className="text-muted-foreground text-xs">
																	Choose how to compare the donation amount
																</p>
															</div>
															<div className="space-y-2">
																<label className="font-medium text-sm">
																	Amount Value
																</label>
																<Input
																	type="number"
																	step="0.01"
																	min="0"
																	value={
																		typeof config.attribute.value === "number"
																			? config.attribute.value
																			: ""
																	}
																	onChange={(e) => {
																		const numValue = parseFloat(e.target.value);
																		if (
																			!Number.isNaN(numValue) &&
																			config.attribute
																		) {
																			handleConfigChange({
																				attribute: {
																					label: config.attribute.label,
																					value: numValue,
																					attribute_name:
																						config.attribute.attribute_name,
																					operator: config.attribute.operator,
																				},
																			});
																		} else if (
																			e.target.value === "" &&
																			config.attribute
																		) {
																			handleConfigChange({
																				attribute: {
																					label: config.attribute.label,
																					value: 0,
																					attribute_name:
																						config.attribute.attribute_name,
																					operator: config.attribute.operator,
																				},
																			});
																		}
																	}}
																	placeholder="Enter amount"
																/>
																<p className="text-muted-foreground text-xs">
																	Enter the donation amount threshold
																</p>
															</div>
														</div>
													)}

												{/* Event Selection from entity event_options */}
												<div className="space-y-2">
													<label className="font-medium text-sm">
														Event Type
													</label>
													<Select
														value={(() => {
															// For subscription with same event values, use label to identify selection
															if (
																config.entity === "subscription" &&
																config.event === "entry.update" &&
																config.attribute
															) {
																const attributeValue = config.attribute.value;
																const selected = selectedEventOptions.find(
																	(e) =>
																		e.value === config.event &&
																		e.presetAttribute?.value === attributeValue,
																);
																return selected?.label ?? config.event ?? "";
															}
															// For donation-transaction with amount comparison, use label to identify selection
															if (
																config.entity === "donation-transaction" &&
																config.event === "entry.create" &&
																config.attribute?.operator
															) {
																const selected = selectedEventOptions.find(
																	(e) =>
																		e.value === config.event &&
																		e.presetAttribute?.operator !== undefined,
																);
																return selected?.label ?? config.event ?? "";
															}
															return config.event ?? "";
														})()}
														onValueChange={onEventChange}
														disabled={selectedEventOptions.length === 0}
													>
														<SelectTrigger>
															<SelectValue placeholder="Select event type" />
														</SelectTrigger>
														<SelectContent>
															{selectedEventOptions.map((event) => (
																<SelectItem
																	key={event.label}
																	value={
																		// Use label as value for subscription events with same event value
																		// For donation-transaction, use label when presetAttribute has operator
																		config.entity === "subscription" &&
																		selectedEventOptions.filter(
																			(e) => e.value === event.value,
																		).length > 1
																			? event.label
																			: config.entity ===
																						"donation-transaction" &&
																					event.presetAttribute?.operator !==
																						undefined
																				? event.label
																				: event.value
																	}
																>
																	<div>
																		<div className="font-medium">
																			{event.label}
																		</div>
																		<div className="text-muted-foreground text-xs">
																			{event.description}
																		</div>
																	</div>
																</SelectItem>
															))}
														</SelectContent>
													</Select>
													<p className="text-muted-foreground text-xs">
														Choose when this trigger should activate
													</p>
												</div>
											</CardContent>
										</Card>
									)}

									{/* Summary */}
									{isConfigurationComplete && (
										<Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
											<Check className="h-4 w-4 text-green-600 dark:text-green-400" />
											<AlertDescription className="text-green-800 dark:text-green-200">
												<div className="mb-2 font-medium">
													Trigger Configuration Complete
												</div>
												<div className="space-y-1 text-sm">
													<div>
														<strong>Entity:</strong> {selectedEntityLabel}
													</div>
													{config.entity === "action" && config.attribute && (
														<div>
															<strong>Action Type:</strong>{" "}
															{config.attribute.label}
														</div>
													)}
													{config.entity === "subscription" &&
														config.attribute && (
															<div>
																<strong>Subscription attribute:</strong>{" "}
																{config.attribute.label} ={" "}
																{config.attribute.value}
															</div>
														)}
													{config.entity === "donation-transaction" &&
														config.attribute?.operator && (
															<div>
																<strong>Donation amount:</strong>{" "}
																{config.attribute.operator === "gt"
																	? "Greater Than"
																	: config.attribute.operator === "lt"
																		? "Less Than"
																		: "Equal"}{" "}
																{config.attribute.value}
															</div>
														)}
													<div>
														<strong>Event:</strong>{" "}
														{renderEventSummary(config.event)}
													</div>
												</div>
											</AlertDescription>
										</Alert>
									)}
								</div>
							</>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
