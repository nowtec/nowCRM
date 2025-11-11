"use client";

import { useCallback, useState } from "react";
import { toast } from "react-hot-toast";
import type { Edge, Node } from "reactflow";
import JourneyBuilder from "@/components/journeys/journey-builder";
import { DocumentId, Form_JourneyStep, Form_JourneyStepConnection, JourneyStepTypes } from "@nowcrm/services";
import {
	activateJourney,
	createConnection,
	createStep,
	deleteConnection,
	deleteStep,
	updateConnection,
	updateConnectionPriorities,
	updateConnectionRules,
	updateJourney,
	updateStep,
} from "./actions";

interface JourneyClientProps {
	journeyId: DocumentId;
	initialTitle: string;
	initialActive: boolean;
	initialNodes: Node[];
	initialEdges: Edge[];
}

const DEFAULT_TITLE = "New Journey";
const MINUTES_PER_DAY = 1440;
const MINUTES_PER_HOUR = 60;

export default function JourneyClient({
	journeyId,
	initialTitle,
	initialActive,
	initialNodes,
	initialEdges,
}: JourneyClientProps) {
	const [journeyTitle, setJourneyTitle] = useState(
		initialTitle || DEFAULT_TITLE,
	);
	const [isEditingTitle, setIsEditingTitle] = useState(false);
	const [isActive, setIsActive] = useState(initialActive || false);
	const [, setJourneyData] = useState<{
		nodes: Node[];
		edges: Edge[];
	}>({ nodes: initialNodes || [], edges: initialEdges || [] });
	const [isSaving, setIsSaving] = useState(false);

	const handleTitleChange = (value: string) => setJourneyTitle(value);

	const handleTitleBlur = async () => {
		setIsEditingTitle(false);

		if (journeyTitle !== initialTitle) {
			try {
				const result = await updateJourney(journeyId, { name: journeyTitle });
				if (!result.success) {
					toast.error("Failed to update journey title");
					setJourneyTitle(initialTitle);
				}
			} catch (error) {
				console.error("Error updating journey title:", error);
				toast.error("Failed to update journey title");
				setJourneyTitle(initialTitle);
			}
		}
	};

	const toggleActivation = async () => {
		try {
			const newActiveState = !isActive;
			const result = await activateJourney(journeyId, newActiveState);

			if (result.success) {
				setIsActive(newActiveState);
				toast.success(
					`Journey ${newActiveState ? "activated" : "deactivated"} successfully`,
				);
			} else {
				toast.error(
					`Failed to ${newActiveState ? "activate" : "deactivate"} journey : ${result.errorMessage}`,
				);
			}
		} catch (error) {
			console.error("Error toggling journey activation:", error);
			toast.error(`Failed to ${!isActive ? "activate" : "deactivate"} journey`);
		}
	};

	// Handle node and edge changes
	const handleDataChange = useCallback(async (nodes: Node[], edges: Edge[]) => {
		setJourneyData({ nodes, edges });
	}, []);

	// Handle node creation
	const handleNodeCreate = useCallback(
		async (node: Node) => {
			try {
				setIsSaving(true);
				const baseData = {
					name: node.data.label || "New Step",
					journey: journeyId,
					type: node.data.type,
					is_start: node.id === "start" || node.data.label === "Start",
				};
				// Build the config based on the node type
				let timing: any, composition: any, channel: any, additional_data: any;
				if (node.data.type === "channel") {
					composition = node.data.config.composition?.value
						? parseInt(node.data.config.composition.value)
						: undefined;
					channel = node.data.config.channel?.value
						? parseInt(node.data.config.channel.value)
						: undefined;
				} else if (node.data.type === "trigger") {
					additional_data = {
						entity: node.data.config.entity || null,
						attribute: node.data.config.attribute || null,
						event: node.data.config.event || null,
						enabled: node.data.config?.enabled !== false,
					};
				} else if (node.data.type === "scheduler-trigger") {
					timing = {
						type: "publish" as const,
						value: new Date(
							`${node.data.config.scheduledDate}T${node.data.config.scheduledTime}`,
						),
					};
					additional_data = {
						enabled: node.data.config?.enabled !== false,
					};
				} else if (node.data.type === "wait") {
					const config = node.data.config || {};

					if (config.mode === "delay") {
						const delay = config.delay || { days: 0, hours: 0, minutes: 0 };
						timing = {
							type: "delay" as const,
							value:
								delay.days * MINUTES_PER_DAY +
								delay.hours * MINUTES_PER_HOUR +
								delay.minutes,
						};
					} else if (config.mode === "publish") {
						const dateStr =
							config.scheduledDate || new Date().toISOString().split("T")[0];
						const timeStr = config.scheduledTime || "09:00";

						timing = {
							type: "publish" as const,
							value: new Date(`${dateStr}T${timeStr}:00`),
						};
					}
					additional_data = {
						enabled: node.data.config?.enabled !== false,
					};
				}

				// Final step data to send
				const stepData = {
					...baseData,
					timing,
					composition,
					channel,
					additional_data,
				};

				const result = await createStep(
					stepData as unknown as Form_JourneyStep,
				);

				if (result.success && result.data) {
					// Update the node with the backend ID
					return {
						...node,
						data: {
							...node.data,
							stepId: result.data.id,
						},
					};
				} else {
					toast.error("Failed to create step in the backend");
					return null;
				}
			} catch (error) {
				console.error("Error creating step:", error);
				toast.error("Failed to create step in the backend");
				return null;
			} finally {
				setIsSaving(false);
			}
		},
		[journeyId],
	);

	// Handle node update
	const handleNodeUpdate = useCallback(async (node: Node) => {
		try {
			setIsSaving(true);

			// Only update if we have a backend ID
			if (!node.data.stepId) {
				console.error("Cannot update node without stepId");
				return false;
			}

			// Extract data from the node to update a step
			const baseData = {
				name: node.data.label || "Updated Step",
				type: node.type,
			};

			let timing: any,
				composition: any,
				channel: any,
				identity: any,
				additional_data: any;

			if (node.data.type === "channel") {
				composition = node.data.config.composition?.value
					? (node.data.config.composition.value)
					: undefined;

				channel = node.data.config.channel?.value
					? (node.data.config.channel.value)
					: undefined;

				identity = node.data.config.identity?.value
					? (node.data.config.identity.value)
					: undefined;
			} else if (node.data.type === "trigger") {
				additional_data = {
					entity: node.data.config.entity || null,
					attribute: node.data.config.attribute || null,
					event: node.data.config.event || null,
					enabled: node.data.config?.enabled !== false,
				};
			} else if (node.data.type === "scheduler-trigger") {
				timing = {
					type: "publish" as const,
					value: new Date(
						`${node.data.config.scheduledDate}T${node.data.config.scheduledTime}`,
					),
				};

				additional_data = {
					enabled: node.data.config.enabled,
				};
			} else if (node.data.type === "wait") {
				const config = node.data.config || {};

				if (config.mode === "delay") {
					const delay = config.delay || { days: 0, hours: 0, minutes: 0 };
					timing = {
						type: "delay" as const,
						value:
							delay.days * MINUTES_PER_DAY +
							delay.hours * MINUTES_PER_HOUR +
							delay.minutes,
					};
				} else if (config.mode === "publish") {
					const dateStr =
						config.scheduledDate || new Date().toISOString().split("T")[0];
					const timeStr = config.scheduledTime || "09:00";

					timing = {
						type: "publish" as const,
						value: new Date(`${dateStr}T${timeStr}:00`),
					};
				}

				additional_data = {
					enabled: node.data.config.enabled,
				};
			}

			// Final data to update
			const stepData = {
				...baseData,
				type: baseData.type as JourneyStepTypes,
				timing,
				composition,
				channel,
				identity,
				additional_data,
			};

			const result = await updateStep(node.data.stepId, stepData);

			if (result.success) {
				return true;
			} else {
				toast.error("Failed to update step in the backend");
				return false;
			}
		} catch (error) {
			console.error("Error updating step:", error);
			toast.error("Failed to update step in the backend");
			return false;
		} finally {
			setIsSaving(false);
		}
	}, []);

	// Handle node deletion
	const handleNodeDelete = useCallback(async (node: Node) => {
		try {
			setIsSaving(true);

			// Only delete if we have a backend ID
			if (!node.data.stepId) {
				console.error("Cannot delete node without stepId");
				return false;
			}

			const result = await deleteStep(node.data.stepId);

			if (result.success) {
				toast.success("Step deleted successfully");
				return true;
			} else {
				toast.error("Failed to delete step in the backend");
				return false;
			}
		} catch (error) {
			console.error("Error deleting step:", error);
			toast.error("Failed to delete step in the backend");
			return false;
		} finally {
			setIsSaving(false);
		}
	}, []);

	// Handle edge creation
	const handleEdgeCreate = useCallback(
		async (edge: Edge, sourceNode: Node, targetNode: Node) => {
			try {
				setIsSaving(true);

				// Only create if both nodes have backend IDs
				if (!sourceNode.data.stepId || !targetNode.data.stepId) {
					console.error(
						"Cannot create connection without source and target stepIds",
					);
					return null;
				}

				// Create connection in backend
				const connectionData = {
					source_step: sourceNode.data.stepId,
					target_step: targetNode.data.stepId,
					condition_type: "all", // Default condition type
				};

				const result = await createConnection(
					connectionData as unknown as Form_JourneyStepConnection,
				);

				if (result.success && result.data) {
					// Update the edge with the backend ID
					return {
						...edge,
						data: {
							...edge.data,
							connectionId: result.data.id,
							condition_type: "all",
						},
					};
				} else {
					toast.error("Failed to create connection in the backend");
					return null;
				}
			} catch (error) {
				console.error("Error creating connection:", error);
				toast.error("Failed to create connection in the backend");
				return null;
			} finally {
				setIsSaving(false);
			}
		},
		[],
	);

	// Handle edge update
	const handleEdgeUpdate = useCallback(async (edge: Edge) => {
		try {
			setIsSaving(true);

			// Only update if we have a backend ID
			if (!edge.data.connectionId) {
				console.error("Cannot update edge without connectionId");
				return false;
			}

			// Update connection in backend
			const connectionData = {
				condition_type: edge.data.condition_type || "all",
			};

			const result = await updateConnection(
				edge.data.connectionId,
				connectionData,
			);

			if (result.success) {
				return true;
			} else {
				toast.error("Failed to update connection in the backend");
				return false;
			}
		} catch (error) {
			console.error("Error updating connection:", error);
			toast.error("Failed to update connection in the backend");
			return false;
		} finally {
			setIsSaving(false);
		}
	}, []);

	// Handle edge deletion
	const handleEdgeDelete = useCallback(async (edge: Edge) => {
		try {
			setIsSaving(true);

			// Only delete if we have a backend ID
			if (!edge.data.connectionId) {
				console.error("Cannot delete edge without connectionId");
				return false;
			}

			const result = await deleteConnection(edge.data.connectionId);

			if (result.success) {
				toast.success("Connection deleted successfully");
				return true;
			} else {
				toast.error("Failed to delete connection in the backend");
				return false;
			}
		} catch (error) {
			console.error("Error deleting connection:", error);
			toast.error("Failed to delete connection in the backend");
			return false;
		} finally {
			setIsSaving(false);
		}
	}, []);

	// Handle edge conditions update
	const handleEdgeConditionsUpdate = useCallback(
		async (edge: Edge, conditions: any[], condition_type: "all" | "any") => {
			try {
				setIsSaving(true);

				// Only update if we have a backend ID
				if (!edge.data?.connectionId) {
					console.error(
						"Cannot update edge conditions without connectionId",
						edge,
					);
					toast.error(
						"Connection not properly initialized. Please refresh and try again.",
					);
					return false;
				}

				function getReadyCondition(condition: any): string {
					const formatSingleCondition = (
						field: string,
						operator: string,
						value: string,
						index: number,
						conditionField?: string,
						conditionOperator?: string,
					): string => {
						return `filters[$and][${index}]${field}${conditionField ? `${conditionField}[${conditionOperator}]` : `[${operator}]`}=${value}`;
					};
					const mainField = condition.type;
					const conditionOperator = condition.conditionOperator;
					const conditionField = condition.conditionField;
					const mainOperator = condition.operator;
					let mainValue: string;
					if (typeof condition.value === "string") {
						try {
							const parsed = JSON.parse(condition.value);
							mainValue = parsed?.value ?? condition.value; // fallback if no `.value` inside
						} catch (_e) {
							mainValue = condition.value;
						}
					} else if (
						typeof condition.value === "object" &&
						condition.value !== null
					) {
						mainValue = condition.value.value ?? condition.value;
					} else {
						mainValue = condition.value;
					}

					if (condition.additionalCondition) {
						const [addField, addOperator, addValue] =
							condition.additionalCondition.split("/");
						const first = formatSingleCondition(
							mainField,
							mainOperator,
							mainValue,
							0,
							conditionField,
							conditionOperator,
						);
						const second = formatSingleCondition(
							addField,
							addOperator,
							addValue,
							1,
						);
						return `${first}&${second}`;
					}
					return `filters${mainField}${conditionField ? `${conditionField}[${conditionOperator}]` : `[${mainOperator}]`}=${mainValue}`;
				}

				// Format conditions for the backend
				const formattedRules = conditions.map((condition) => ({
					id: condition.id?.startsWith("condition-")
						? Number.parseInt(condition.id.replace("condition-", ""))
						: undefined,
					condition: condition.type,
					ready_condition: condition.value
						? getReadyCondition(condition)
						: condition.ready_condition,
					condition_operator: condition.operator,
					condition_value: condition.value,
					additional_data: condition.additional_data,
					additional_condition: condition.additionalCondition,
					label: condition.label,
					scores:
						condition.scores?.map((score: any) => ({
							id: score.id,
							attribute: score.attribute,
							value: score.value,
						})) || [],
				}));

				console.log(formattedRules);
				// Update connection rules in backend
				const result = await updateConnectionRules(
					edge.data.connectionId,
					formattedRules,
					condition_type,
				);

				if (result.success) {
					return true;
				} else {
					toast.error("Failed to update connection rules in the backend");
					return false;
				}
			} catch (error) {
				console.error("Error updating connection rules:", error);
				toast.error("Failed to update connection rules in the backend");
				return false;
			} finally {
				setIsSaving(false);
			}
		},
		[],
	);

	// Add a new handler for updating connection priorities
	const handleConnectionPrioritiesUpdate = useCallback(
		async (
			connectionPriorities: { connectionId: DocumentId; priority: number }[],
		) => {
			try {
				setIsSaving(true);

				// Update connection priorities in the backend
				const result = await updateConnectionPriorities(connectionPriorities);

				if (result.success) {
					toast.success("Branch priorities updated successfully");
					return true;
				} else {
					toast.error("Failed to update branch priorities");
					return false;
				}
			} catch (error) {
				console.error("Error updating branch priorities:", error);
				toast.error("Failed to update branch priorities");
				return false;
			} finally {
				setIsSaving(false);
			}
		},
		[setIsSaving],
	);

	return (
		<div className="h-[calc(100vh-4rem)] w-full overflow-hidden bg-background">
			<JourneyBuilder
				onDataChange={handleDataChange}
				initialNodes={initialNodes}
				initialEdges={initialEdges}
				onNodeCreate={handleNodeCreate}
				onNodeUpdate={handleNodeUpdate}
				onNodeDelete={handleNodeDelete}
				onEdgeCreate={handleEdgeCreate}
				onEdgeUpdate={handleEdgeUpdate}
				onEdgeDelete={handleEdgeDelete}
				onEdgeConditionsUpdate={handleEdgeConditionsUpdate}
				onConnectionPrioritiesUpdate={handleConnectionPrioritiesUpdate}
				isSaving={isSaving}
				journeyTitle={journeyTitle}
				isEditingTitle={isEditingTitle}
				isActive={isActive}
				onTitleChange={handleTitleChange}
				onTitleBlur={handleTitleBlur}
				onEditToggle={setIsEditingTitle}
				onToggleActivation={toggleActivation}
				isSave={isSaving}
			/>
		</div>
	);
}
