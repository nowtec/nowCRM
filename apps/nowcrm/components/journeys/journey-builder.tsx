"use client";

import type React from "react";

import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import ReactFlow, {
	addEdge,
	Background,
	type Connection,
	Controls,
	type Edge,
	type Node,
	type NodeTypes,
	type OnConnectEnd,
	type OnConnectStart,
	type ReactFlowInstance,
	ReactFlowProvider,
	useEdgesState,
	useNodesState,
} from "reactflow";
import "reactflow/dist/style.css";
import type { DocumentId } from "@nowcrm/services";
import { Info, Trash2, X } from "lucide-react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "../ui/alert";
import { ConnectionPanel } from "./connection-panel/connection-panel";
import { HeaderBar } from "./header-bar";
import { initialEdges, initialNodes } from "./initial-data";
import { ChannelNode } from "./nodes/channel-node";
import { SchedulerTriggerNode } from "./nodes/scheduler-trigger-node";
import { TriggerNode } from "./nodes/trigger-node";
import { WaitNode } from "./nodes/wait-node";
import { ChannelPanel } from "./panels/channel-panel";
import { SchedulerTriggerPanel } from "./panels/scheduler-trigger-panel";
import { TriggerPanel } from "./panels/trigger-panel";
import { WaitPanel } from "./panels/wait-panel";
import { StepSelectorPanel } from "./step-selector";

const nodeTypes: NodeTypes = {
	channel: ChannelNode as any,
	trigger: TriggerNode as any,
	"scheduler-trigger": SchedulerTriggerNode as any,
	wait: WaitNode as any,
};

// Update the JourneyBuilderProps interface to include the new callback
interface JourneyBuilderProps {
	onDataChange?: (nodes: Node[], edges: Edge[]) => void;
	initialNodes?: Node[];
	initialEdges?: Edge[];
	onNodeCreate?: (node: Node) => Promise<Node | null>;
	onNodeUpdate?: (node: Node) => Promise<boolean>;
	onNodeDelete?: (node: Node) => Promise<boolean>;
	onEdgeCreate?: (
		edge: Edge,
		sourceNode: Node,
		targetNode: Node,
	) => Promise<Edge | null>;
	onEdgeUpdate?: (edge: Edge) => Promise<boolean>;
	onEdgeDelete?: (edge: Edge) => Promise<boolean>;
	onEdgeConditionsUpdate?: (
		edge: Edge,
		conditions: any[],
		condition_type: "all" | "any",
	) => Promise<{ success: boolean; conditions: any[] | null }>;
	onConnectionPrioritiesUpdate?: (
		connectionPriorities: { connectionId: DocumentId; priority: number }[],
	) => Promise<boolean>;
	onRulePrioritiesUpdate?: (
		rulePriorities: { ruleId: DocumentId; priority: number }[],
	) => Promise<boolean>;
	isSaving?: boolean;
	journeyTitle: string;
	isEditingTitle: boolean;
	isActive: boolean;
	isSave?: boolean;
	onTitleChange: (val: string) => void;
	onTitleBlur: () => void;
	onEditToggle: (val: boolean) => void;
	onToggleActivation: () => void;
}

// Pass the new prop to JourneyBuilderContent
export default function JourneyBuilder({
	onDataChange,
	initialNodes: propInitialNodes,
	initialEdges: propInitialEdges,
	onNodeCreate,
	onNodeUpdate,
	onNodeDelete,
	onEdgeCreate,
	onEdgeUpdate,
	onEdgeDelete,
	onEdgeConditionsUpdate,
	onRulePrioritiesUpdate,
	onConnectionPrioritiesUpdate,
	isSaving = false,
	journeyTitle,
	isEditingTitle,
	isActive,
	isSave,
	onTitleChange,
	onTitleBlur,
	onEditToggle,
	onToggleActivation,
}: JourneyBuilderProps) {
	return (
		<ReactFlowProvider>
			<JourneyBuilderContent
				onDataChange={onDataChange}
				initialNodes={propInitialNodes}
				initialEdges={propInitialEdges}
				onNodeCreate={onNodeCreate}
				onNodeUpdate={onNodeUpdate}
				onNodeDelete={onNodeDelete}
				onEdgeCreate={onEdgeCreate}
				onEdgeUpdate={onEdgeUpdate}
				onEdgeDelete={onEdgeDelete}
				onEdgeConditionsUpdate={onEdgeConditionsUpdate}
				onRulePrioritiesUpdate={onRulePrioritiesUpdate}
				onConnectionPrioritiesUpdate={onConnectionPrioritiesUpdate}
				isSaving={isSaving}
				journeyTitle={journeyTitle}
				isEditingTitle={isEditingTitle}
				isActive={isActive}
				isSave={isSave}
				onTitleChange={onTitleChange}
				onTitleBlur={onTitleBlur}
				onEditToggle={onEditToggle}
				onToggleActivation={onToggleActivation}
			/>
		</ReactFlowProvider>
	);
}

// Add this function before the JourneyBuilderContent component
// This suppresses the ResizeObserver error in development
const suppressResizeObserverError = () => {
	const originalError = window.console.error;
	window.console.error = (...args) => {
		if (
			typeof args[0] === "string" &&
			args[0].includes("ResizeObserver loop") &&
			args[0].includes("completed with undelivered notifications")
		) {
			// Suppress the specific ResizeObserver error
			return;
		}
		originalError(...args);
	};

	return () => {
		window.console.error = originalError;
	};
};

function JourneyBuilderContent({
	onDataChange,
	initialNodes: propInitialNodes,
	initialEdges: propInitialEdges,
	onNodeCreate,
	onNodeUpdate,
	onNodeDelete,
	onEdgeCreate,
	onEdgeUpdate,
	onEdgeDelete,
	onEdgeConditionsUpdate,
	onConnectionPrioritiesUpdate,
	isSaving,
	journeyTitle,
	isEditingTitle,
	isActive,
	isSave,
	onTitleChange,
	onTitleBlur,
	onEditToggle,
	onToggleActivation,
}: JourneyBuilderProps) {
	const reactFlowWrapper = useRef<HTMLDivElement>(null);

	// Use provided initial data or fall back to defaults
	const [nodes, setNodes, onNodesChange] = useNodesState(
		propInitialNodes && propInitialNodes.length > 0
			? propInitialNodes
			: initialNodes,
	);
	const [edges, setEdges, onEdgesChange] = useEdgesState(
		propInitialEdges && propInitialEdges.length > 0
			? propInitialEdges
			: initialEdges,
	);

	// Update nodes and edges when props change
	useEffect(() => {
		if (propInitialNodes && propInitialNodes.length > 0) {
			setNodes(propInitialNodes);
		}
	}, [propInitialNodes, setNodes]);

	useEffect(() => {
		if (propInitialEdges && propInitialEdges.length > 0) {
			setEdges(propInitialEdges);
		}
	}, [propInitialEdges, setEdges]);

	const [reactFlowInstance, setReactFlowInstance] =
		useState<ReactFlowInstance | null>(null);
	const [selectedNode, setSelectedNode] = useState<Node | null>(null);
	const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
	const [dragHandleNodeId, setDragHandleNodeId] = useState<string | null>(null);
	const [showStepSelectorPanel, setShowStepSelectorPanel] = useState(false);
	const [pendingNodeId, setPendingNodeId] = useState<string | null>(null);
	const [isInitialized, setIsInitialized] = useState(false);
	const [pendingConnection, setPendingConnection] = useState<{
		sourceNodeId: string;
		targetNodeId: string;
		position: { x: number; y: number };
	} | null>(null);

	// Show step selector panel when journey has no nodes
	useEffect(() => {
		if (
			!isInitialized &&
			nodes.length === 0 &&
			!showStepSelectorPanel &&
			propInitialNodes?.length === 0
		) {
			setShowStepSelectorPanel(true);
			setIsInitialized(true);
		}
	}, [nodes, showStepSelectorPanel, isInitialized, propInitialNodes]);

	// Listen for the requestJourneyData event
	useEffect(() => {
		const handleRequestJourneyData = () => {
			if (onDataChange) {
				onDataChange(nodes, edges);
			}
		};

		window.addEventListener("requestJourneyData", handleRequestJourneyData);

		return () => {
			window.removeEventListener(
				"requestJourneyData",
				handleRequestJourneyData,
			);
		};
	}, [nodes, edges, onDataChange]);

	// Helper function to create a new node from plus icon
	const createNodeFromPlus = useCallback(
		async (sourceNodeId: string) => {
			const sourceNode = nodes.find((node) => node.id === sourceNodeId);
			if (!sourceNode || !reactFlowInstance) return;

			// Calculate position for new node (to the right of source node)
			const sourceNodeElement = reactFlowInstance.getNode(sourceNodeId);
			if (!sourceNodeElement) return;

			const position = {
				x: sourceNodeElement.position.x + 350, // Place 350px to the right
				y: sourceNodeElement.position.y,
			};

			// Create hierarchical numbering for the step title
			const existingEdges = edges.filter(
				(edge) => edge.source === sourceNodeId,
			);
			const branchNumber = existingEdges.length + 1;

			let newStepTitle = "New Step";
			if (sourceNode.data.label.match(/New Step \d+(\.\d+)*$/)) {
				newStepTitle = `${sourceNode.data.label}.${branchNumber}`;
			} else if (
				sourceNode.data.label === "New Step" ||
				sourceNode.data.label === "Start"
			) {
				newStepTitle = `New Step ${branchNumber}`;
			} else {
				newStepTitle = `${sourceNode.data.label} ${branchNumber}`;
			}

			const newNodeId = `step-${Date.now()}`;
			const newNode: Node = {
				id: newNodeId,
				type: "channel", // Temporary type, will be changed after selection
				position,
				data: {
					label: newStepTitle,
					config: {},
					isPending: true, // Flag to indicate this node needs type selection
				},
			};

			// Create the node in the backend if callback provided
			let createdNode = newNode;
			if (onNodeCreate) {
				const result = await onNodeCreate(newNode);
				if (!result) {
					toast.error("Failed to create step in the backend");
					return;
				}
				createdNode = result;
			}

			// Add the node
			setNodes((nds) => {
				const updatedNodes = nds.concat(createdNode);
				console.log("Node added from plus icon:", createdNode);
				return updatedNodes;
			});

			// Store the pending connection
			setPendingConnection({
				sourceNodeId,
				targetNodeId: newNodeId,
				position,
			});

			// Show step selector for the new node
			setPendingNodeId(newNodeId);
			setShowStepSelectorPanel(true);
			setSelectedNode(null);
			setSelectedEdge(null);
		},
		[
			nodes,
			edges,
			reactFlowInstance,
			onNodeCreate,
			setNodes,
			setPendingConnection,
			setPendingNodeId,
			setShowStepSelectorPanel,
			setSelectedNode,
			setSelectedEdge,
		],
	);

	// Listen for plus icon clicks
	useEffect(() => {
		const handleCreateNodeFromPlus = async (event: Event) => {
			const customEvent = event as CustomEvent<{ sourceNodeId: string }>;
			const { sourceNodeId } = customEvent.detail;
			await createNodeFromPlus(sourceNodeId);
		};

		window.addEventListener("createNodeFromPlus", handleCreateNodeFromPlus);

		return () => {
			window.removeEventListener(
				"createNodeFromPlus",
				handleCreateNodeFromPlus,
			);
		};
	}, [createNodeFromPlus]);

	// FIX 1: Use useEffect to notify parent of changes instead of setTimeout
	useEffect(() => {
		if (onDataChange && isInitialized) {
			onDataChange(nodes, edges);
		}
	}, [nodes, edges, onDataChange, isInitialized]);

	// Suppress ResizeObserver error
	useLayoutEffect(() => {
		const cleanup = suppressResizeObserverError();
		return cleanup;
	}, []);

	// Check if the selected node is the start node
	const isStartNode =
		selectedNode &&
		(selectedNode.id === "start" ||
			selectedNode.data.label === "Start" ||
			selectedNode.data.label === "start");

	// Auto-select the start node when the component mounts and ReactFlow is initialized
	useEffect(() => {
		if (reactFlowInstance && nodes.length > 0 && !isInitialized) {
			// Find the start node
			const startNode = nodes.find(
				(node) =>
					node.id === "start" ||
					node.data.label === "Start" ||
					node.data.label === "start",
			);

			if (startNode) {
				// Check if the start node needs type selection
				if (startNode.data.isPending || !startNode.data.type) {
					setPendingNodeId(startNode.id);
					setShowStepSelectorPanel(true);
				} else {
					setSelectedNode(startNode);
				}
				setIsInitialized(true);
			}
		}
	}, [reactFlowInstance, nodes, isInitialized]);

	// Helper function to fit all nodes in the viewport
	const fitAllNodes = useCallback(() => {
		if (reactFlowInstance) {
			// Wait a bit to ensure all nodes are properly rendered
			setTimeout(() => {
				reactFlowInstance.fitView({
					padding: 1.5,
					duration: 800,
					includeHiddenNodes: false,
				});
			}, 100);
		}
	}, [reactFlowInstance]);

	// Helper function to check if a node type is a trigger
	const isTriggerType = (type: string | undefined) =>
		type === "trigger" || type === "scheduler-trigger";

	// Helper function to validate connections
	const validateConnection = (sourceNode: Node, targetNode: Node): boolean => {
		// Prevent connections between two trigger nodes
		if (isTriggerType(sourceNode.type) && isTriggerType(targetNode.type)) {
			toast.error("Cannot connect two trigger nodes together");
			return false;
		}

		// Add more validation rules here if needed
		// For example:
		// - Prevent self-connections
		if (sourceNode.id === targetNode.id) {
			toast.error("Cannot connect a node to itself");
			return false;
		}

		// - Check for existing connections
		const existingConnection = edges.find(
			(edge) =>
				(edge.source === sourceNode.id && edge.target === targetNode.id) ||
				(edge.source === targetNode.id && edge.target === sourceNode.id),
		);
		if (existingConnection) {
			toast.error("Connection already exists between these nodes");
			return false;
		}

		return true;
	};

	function adjustEdgeDirection(
		sourceNode: Node,
		targetNode: Node,
	): { source: Node; target: Node; swapped: boolean } {
		// Triggers must always be source
		if (isTriggerType(targetNode.type) && !isTriggerType(sourceNode.type)) {
			return {
				source: targetNode,
				target: sourceNode,
				swapped: true,
			};
		}

		return { source: sourceNode, target: targetNode, swapped: false };
	}

	const onConnect = useCallback(
		async (params: Connection) => {
			// Find source and target nodes
			const rawSourceNode = nodes.find((node) => node.id === params.source);
			const rawTargetNode = nodes.find((node) => node.id === params.target);

			if (!rawSourceNode || !rawTargetNode) {
				toast.error("Source or target node not found");
				return;
			}

			// Validate the connection before proceeding
			if (!validateConnection(rawSourceNode, rawTargetNode)) {
				return;
			}

			const { source: sourceNode, target: targetNode } = adjustEdgeDirection(
				rawSourceNode,
				rawTargetNode,
			);

			// Find existing connections from the same source node to determine next priority
			const existingConnectionsFromSource = edges.filter(
				(e) => e.source === sourceNode.id,
			);
			const maxPriority =
				existingConnectionsFromSource.length > 0
					? Math.max(
							...existingConnectionsFromSource.map(
								(e) => e.data?.priority || 1,
							),
						)
					: 0;
			const newPriority = maxPriority + 1;

			// Create a new edge with no default conditions
			// Now use the final source/target in newEdge
			const newEdge: Edge = {
				id: `e-${sourceNode.id}-${targetNode.id}`,
				type: "default",
				animated: false,
				source: sourceNode.id,
				target: targetNode.id,
				style: {
					strokeWidth: 1,
					strokeDasharray: "5 5",
				},
				data: {
					conditions: [],
					condition_type: "all",
					priority: newPriority,
					ruleNotAllowed: isTriggerType(sourceNode.data.type),
				},
				label: isTriggerType(sourceNode.data.type)
					? ""
					: "Configure Connection",
				labelStyle: {
					fill: "#fff",
					fontSize: 12,
					fontWeight: 500,
				},
				labelBgStyle: {
					fill: "#aaa",
					fillOpacity: 1,
					padding: 5,
				},
				labelBgPadding: [8, 4] as [number, number],
				labelShowBg: true,
				labelBgBorderRadius: 4,
				className: "edge-label-hover",
			};

			// Create the edge in the backend if callback provided
			let updatedEdge = newEdge;
			if (onEdgeCreate) {
				const createdEdge = await onEdgeCreate(newEdge, sourceNode, targetNode);
				if (!createdEdge) {
					toast.error("Failed to create connection in the backend");
					return;
				}
				updatedEdge = createdEdge;
			}

			setEdges((eds) => {
				const newEdges = addEdge(updatedEdge, eds);
				console.log("Edge connected:", updatedEdge);
				return newEdges;
			});

			// Select the new edge for editing
			setTimeout(() => {
				setSelectedEdge(updatedEdge);
				setSelectedNode(null);
				fitAllNodes();
			}, 50);
		},
		[
			setEdges,
			setSelectedEdge,
			setSelectedNode,
			fitAllNodes,
			nodes,
			edges,
			onEdgeCreate,
		],
	);

	// Fix: Update the onConnectStart handler to match ReactFlow's expected type
	const onConnectStart: OnConnectStart = useCallback((_event, { nodeId }) => {
		if (nodeId) {
			setDragHandleNodeId(nodeId);
		}
	}, []);

	// Fix: Update the onConnectEnd handler to match ReactFlow's expected type
	const onConnectEnd: OnConnectEnd = useCallback(
		async (event) => {
			if (!dragHandleNodeId || !reactFlowInstance) return;

			// Check if we're dropping on the canvas (not on an existing node)
			const targetIsPane = (event.target as Element).classList.contains(
				"react-flow__pane",
			);

			if (targetIsPane) {
				// Get the position where the mouse was released
				const { top, left } = reactFlowWrapper.current!.getBoundingClientRect();

				// Handle both mouse and touch events
				const clientX =
					"clientX" in event ? event.clientX : event.touches[0].clientX;
				const clientY =
					"clientY" in event ? event.clientY : event.touches[0].clientY;

				const position = reactFlowInstance.screenToFlowPosition({
					x: clientX - left,
					y: clientY - top,
				});

				// Find the source node to create hierarchical numbering
				const sourceNode = nodes.find((node) => node.id === dragHandleNodeId);
				let newStepTitle = "New Step";

				// Create hierarchical numbering for the step title
				if (sourceNode) {
					// Get all existing edges from this source node
					const existingEdges = edges.filter(
						(edge) => edge.source === dragHandleNodeId,
					);
					const branchNumber = existingEdges.length + 1;

					// If source node has a numeric title pattern, create a sub-step number
					if (sourceNode.data.label.match(/New Step \d+(\.\d+)*$/)) {
						newStepTitle = `${sourceNode.data.label}.${branchNumber}`;
					}
					// If source node is just "New Step" or doesn't follow the pattern, start numbering
					else if (
						sourceNode.data.label === "New Step" ||
						sourceNode.data.label === "Start"
					) {
						newStepTitle = `New Step ${branchNumber}`;
					}
					// Otherwise use the default with the branch number
					else {
						newStepTitle = `${sourceNode.data.label} ${branchNumber}`;
					}
				}

				const newNodeId = `step-${Date.now()}`;
				const newNode: Node = {
					id: newNodeId,
					type: "channel", // Temporary type, will be changed after selection
					position,
					data: {
						label: newStepTitle,
						config: {},
						isPending: true, // Flag to indicate this node needs type selection
					},
				};

				// Create the node in the backend if callback provided
				let createdNode = newNode;
				if (onNodeCreate) {
					const result = await onNodeCreate(newNode);
					if (!result) {
						toast.error("Failed to create step in the backend");
						console.log(result);
						return;
					}
					createdNode = result;
				}

				// Add the node
				setNodes((nds) => {
					const updatedNodes = nds.concat(createdNode);
					console.log("Node added from connection:", createdNode);
					return updatedNodes;
				});

				// Create the connection with no default conditions
				// Store the pending connection instead of creating the edge immediately
				setPendingConnection({
					sourceNodeId: dragHandleNodeId,
					targetNodeId: newNodeId,
					position,
				});

				// Show step selector for the new node
				setPendingNodeId(newNodeId);
				setShowStepSelectorPanel(true);
				// Clear any selected node/edge to ensure step selector shows
				setSelectedNode(null);
				setSelectedEdge(null);
			}

			setDragHandleNodeId(null);
		},
		[
			dragHandleNodeId,
			reactFlowInstance,
			setNodes,
			setEdges,
			fitAllNodes,
			nodes,
			edges,
			onNodeCreate,
			setPendingConnection,
			setPendingNodeId,
			setShowStepSelectorPanel,
			setSelectedNode,
			setSelectedEdge,
		],
	);

	const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		event.dataTransfer.dropEffect = "move";
	}, []);

	const onDrop = useCallback(
		async (event: React.DragEvent<HTMLDivElement>) => {
			event.preventDefault();

			if (!reactFlowWrapper.current || !reactFlowInstance) return;

			const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
			const type = event.dataTransfer.getData("application/reactflow");

			if (typeof type === "undefined" || !type) {
				return;
			}

			const position = reactFlowInstance.project({
				x: event.clientX - reactFlowBounds.left,
				y: event.clientY - reactFlowBounds.top,
			});

			// Create default config based on node type
			let config: any;
			if (type === "channel") {
				config = {
					composition: "",
					channel: "",
					trackConversion: false,
					conditions: [],
				};
			} else if (type === "trigger") {
				config = {
					entity: null,
					attribute: null,
					event: null,
					enabled: true,
				};
			} else if (type === "scheduler-trigger") {
				config = {
					enabled: true,
					scheduledDate: new Date().toISOString().split("T")[0],
					scheduledTime: "09:00",
				};
			} else if (type === "wait") {
				config = {
					enabled: true,
					delay: { days: 0, hours: 0, minutes: 0 },
					mode: "delay",
					scheduledDate: new Date().toISOString().split("T")[0],
					scheduledTime: "09:00",
				};
			}

			const newNode: Node = {
				id: `step-${Date.now()}`,
				type: type as "channel" | "trigger" | "scheduler-trigger" | "wait",
				position,
				data: {
					label: "New Step",
					type,
					config,
				},
			};

			// Create the node in the backend if callback provided
			let createdNode = newNode;
			if (onNodeCreate) {
				const result = await onNodeCreate(newNode);
				if (!result) {
					toast.error("Failed to create step in the backend");
					console.log(result);
					return;
				}
				createdNode = result;
			}

			// Add the node and automatically select it
			setNodes((nds) => {
				const updatedNodes = nds.concat(createdNode);
				console.log("Node added from drop:", createdNode);

				// Set timeout to ensure the node is added before selecting it
				setTimeout(() => {
					setSelectedNode(createdNode);
					fitAllNodes();
				}, 50);
				return updatedNodes;
			});
		},
		[reactFlowInstance, setNodes, fitAllNodes, onNodeCreate],
	);

	const onNodeClick = useCallback(
		(_: React.MouseEvent, node: Node) => {
			console.log("Node selected:", node);

			// Check if this node needs type selection first
			if (node.data.isPending || !node.data.type) {
				setPendingNodeId(node.id);
				setShowStepSelectorPanel(true);
				setSelectedNode(null); // Don't select the node yet
				setSelectedEdge(null);
			} else {
				// Node has a type, show its configuration panel
				setSelectedNode(node);
				setSelectedEdge(null);
				setShowStepSelectorPanel(false);

				// Center the viewport on the selected node
				if (reactFlowInstance) {
					setTimeout(() => {
						reactFlowInstance.setCenter(
							node.position.x + 140,
							node.position.y + 50,
							{
								zoom: 1,
								duration: 400,
							},
						);
					}, 50);
				}
			}
		},
		[reactFlowInstance],
	);

	// Center viewport on selected node with debouncing
	const centerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	useEffect(() => {
		// Remove the condition that was preventing centering when a node is selected
		if (!reactFlowInstance) return;

		if (centerTimeoutRef.current) {
			clearTimeout(centerTimeoutRef.current);
		}

		// Only auto-fit when no specific node or edge is selected and no panel is open
		if (!selectedNode && !selectedEdge && !showStepSelectorPanel) {
			centerTimeoutRef.current = setTimeout(() => {
				if (reactFlowInstance) {
					reactFlowInstance.fitView({
						padding: 0.5,
						includeHiddenNodes: false,
						duration: 500,
					});
				}
			}, 300);
		}

		return () => {
			if (centerTimeoutRef.current) {
				clearTimeout(centerTimeoutRef.current);
			}
		};
	}, [selectedNode, selectedEdge, reactFlowInstance, showStepSelectorPanel]);

	const centerOnEdge = useCallback(
		(edge: Edge) => {
			if (!reactFlowInstance || !reactFlowWrapper.current) return;

			const sourceNode = reactFlowInstance.getNode(edge.source);
			const targetNode = reactFlowInstance.getNode(edge.target);
			if (!sourceNode || !targetNode) return;

			const centerX = (sourceNode.position.x + targetNode.position.x) / 2;
			const centerY = (sourceNode.position.y + targetNode.position.y) / 2;

			reactFlowInstance.setCenter(centerX, centerY, {
				zoom: 1,
				duration: 400,
			});
		},
		[reactFlowInstance],
	);

	const onEdgeClick = useCallback(
		(_: React.MouseEvent, edge: Edge) => {
			console.log("Edge selected:", edge);
			setSelectedEdge(edge);
			setSelectedNode(null);
			setShowStepSelectorPanel(false); // Hide step selector when edge is selected
			centerOnEdge(edge); // ✅ zoom to edge
		},
		[setSelectedEdge, setSelectedNode, centerOnEdge],
	);

	const onPaneClick = useCallback(() => {
		console.log("Canvas clicked, deselecting all");
		setSelectedNode(null);
		setSelectedEdge(null);
		setShowStepSelectorPanel(false); // Hide step selector when clicking canvas
		if (reactFlowInstance) {
			reactFlowInstance.fitView({ padding: 1 });
		}
	}, [reactFlowInstance]);

	const updateNodeConfig = useCallback(
		async (nodeId: string, config: any) => {
			console.log("Node config updated:", { nodeId, config });
			setNodes((nds) => {
				return nds.map((node) => {
					if (node.id === nodeId) {
						const updatedNode = {
							...node,
							data: {
								...node.data,
								config,
							},
						};

						// Update the node in the backend if callback provided
						if (onNodeUpdate) {
							onNodeUpdate(updatedNode).catch((error) => {
								console.error("Error updating node:", error);
								toast.error("Failed to update step in the backend");
							});
						}

						return updatedNode;
					}
					return node;
				});
			});
		},
		[setNodes, onNodeUpdate],
	);

	const updateNodeLabel = useCallback(
		async (nodeId: string, label: string) => {
			console.log("Node label updated:", { nodeId, label });
			setNodes((nds) => {
				return nds.map((node) => {
					if (node.id === nodeId) {
						const updatedNode = {
							...node,
							data: {
								...node.data,
								label,
							},
						};

						// Update the node in the backend if callback provided
						if (onNodeUpdate) {
							onNodeUpdate(updatedNode).catch((error) => {
								console.error("Error updating node label:", error);
								toast.error("Failed to update step label in the backend");
							});
						}

						return updatedNode;
					}
					return node;
				});
			});
		},
		[setNodes, onNodeUpdate],
	);

	const updateNodeType = useCallback(
		async (nodeId: string, newType: string): Promise<Node | null> => {
			let resolvedNode: Node | null = null;

			await new Promise<void>((resolve) => {
				setNodes((nodes) => {
					const updatedNodes = nodes.map((node) => {
						if (node.id !== nodeId) return node;

						let config: any = {};
						if (newType === "channel") {
							config = {
								composition: "",
								channel: "",
								trackConversion: false,
								conditions: [],
							};
						} else if (newType === "trigger") {
							config = {
								entity: null,
								attribute: null,
								event: null,
								enabled: true,
							};
						} else if (newType === "scheduler-trigger") {
							config = {
								enabled: true,
								scheduledDate: new Date().toISOString().split("T")[0],
								scheduledTime: "09:00",
							};
						} else if (newType === "wait") {
							config = {
								enabled: true,
								delay: { days: 0, hours: 0, minutes: 0 },
							};
						}

						const updated: Node = {
							...node,
							type: newType as Node["type"], // <== KEY: update the actual node type
							data: {
								...node.data,
								type: newType,
								config,
								isPending: false,
								label:
									node.data.label === "New Step" ? "Start" : node.data.label,
							},
						};
						resolvedNode = updated;

						// Backend update
						if (onNodeUpdate) {
							onNodeUpdate(updated).catch((err) => {
								toast.error("Failed to update node type in backend");
								console.error(err);
							});
						}

						return updated;
					});

					resolve(); // Ensures state update finishes before returning
					return updatedNodes;
				});
			});

			return resolvedNode;
		},
		[setNodes, onNodeUpdate],
	);

	const updateEdgeConditions = useCallback(
		async (edgeId: string, data: any) => {
			console.log("Edge conditions updated:", { edgeId, data });

			// Find the current edge to ensure we have the connectionId
			const currentEdge = edges.find((e) => e.id === edgeId);
			if (!currentEdge?.data?.connectionId) {
				console.error("Edge missing connectionId:", currentEdge);
				toast.error("Connection not properly initialized");
				return;
			}

			// Update the edge conditions in the backend first
			if (onEdgeConditionsUpdate) {
				try {
					const edgeWithConnectionId = {
						...currentEdge,
						data: {
							...currentEdge.data,
							...data,
						},
					};

					const result = await onEdgeConditionsUpdate(
						edgeWithConnectionId,
						data.conditions || [],
						data.condition_type || "all",
					);

					if (!result.success) {
						toast.error("Failed to save connection rules");
						return;
					}

					// Update data with returned conditions that have documentIds
					if (result.conditions) {
						data.conditions = result.conditions;
					}

					toast.success("Connection rules saved successfully");
				} catch (error) {
					console.error("Error updating edge conditions:", error);
					toast.error("Failed to update connection conditions in the backend");
					return;
				}
			}

			// Update the UI state after successful backend update
			setEdges((eds) => {
				return eds.map((edge) => {
					if (edge.id === edgeId) {
						// Generate label from conditions
						let label = "No conditions (click to configure)";

						if (data.conditions && data.conditions.length > 0) {
							if (data.conditions.length === 1) {
								label = data.conditions[0].label;
							} else {
								label = `${data.condition_type === "all" ? "All" : "Any"} of ${data.conditions.length} conditions`;
							}
						}

						// Update edge style based on conditions
						const style =
							data.conditions && data.conditions.length > 0
								? {
										strokeWidth: 2,
										stroke: "#22c55e", // Green color for edges with conditions
									}
								: {
										strokeWidth: 1,
										stroke: "#aaa",
										strokeDasharray: "5 5", // Dashed line for edges without conditions
									};

						// Set label background color based on conditions
						const labelBgStyle =
							data.conditions && data.conditions.length > 0
								? {
										fill: "#22c55e", // Green background for edges with conditions
										fillOpacity: 1,
										rx: 10,
										ry: 10,
										padding: 5,
									}
								: {
										fill: "#aaa", // Gray background for edges without conditions
										fillOpacity: 1,
										rx: 10,
										ry: 10,
										padding: 5,
									};

						return {
							...edge,
							data,
							label,
							style,
							labelBgStyle,
							className:
								data.conditions && data.conditions.length > 0
									? "has-conditions"
									: "edge-label-hover",
						};
					}
					return edge;
				});
			});
		},
		[setEdges, onEdgeConditionsUpdate, edges],
	);

	const deleteNode = useCallback(async () => {
		if (!selectedNode) return;

		console.log("Node deleted:", selectedNode);

		// Delete the node in the backend first if callback provided
		if (onNodeDelete) {
			const success = await onNodeDelete(selectedNode);
			if (!success) {
				// Don't proceed with UI deletion if backend deletion failed
				return;
			}
		}

		// Delete the node from UI
		setNodes((nds) => {
			const updatedNodes = nds.filter((node) => node.id !== selectedNode.id);

			// Delete any connected edges
			setEdges((eds) => {
				return eds.filter(
					(edge) =>
						edge.source !== selectedNode.id && edge.target !== selectedNode.id,
				);
			});

			return updatedNodes;
		});

		// Clear the selected node
		setSelectedNode(null);

		// Fit all remaining nodes in the viewport
		setTimeout(() => {
			fitAllNodes();
		}, 50);
	}, [selectedNode, setNodes, setEdges, fitAllNodes, onNodeDelete]);

	const deleteEdge = useCallback(async () => {
		if (!selectedEdge) return;

		console.log("Edge deleted:", selectedEdge);

		// Delete the edge in the backend first if callback provided
		if (onEdgeDelete) {
			const success = await onEdgeDelete(selectedEdge);
			if (!success) {
				// Don't proceed with UI deletion if backend deletion failed
				return;
			}
		}

		// Delete the edge from UI
		setEdges((eds) => {
			return eds.filter((edge) => edge.id !== selectedEdge.id);
		});

		// Clear the selected edge
		setSelectedEdge(null);
	}, [selectedEdge, setEdges, onEdgeDelete]);

	// Determine if a configuration panel is open
	const isPanelOpen = selectedNode || selectedEdge || showStepSelectorPanel;

	// Auto-fit view with debouncing
	const fitViewTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	useEffect(() => {
		// Only auto-fit when nothing is selected and no panels are open
		if (
			!reactFlowInstance ||
			selectedNode ||
			selectedEdge ||
			showStepSelectorPanel
		)
			return;

		if (fitViewTimeoutRef.current) {
			clearTimeout(fitViewTimeoutRef.current);
		}

		fitViewTimeoutRef.current = setTimeout(() => {
			if (reactFlowInstance) {
				reactFlowInstance.fitView({
					padding: 0.5,
					includeHiddenNodes: false,
					duration: 500,
				});
			}
		}, 300);

		return () => {
			if (fitViewTimeoutRef.current) {
				clearTimeout(fitViewTimeoutRef.current);
			}
		};
	}, [selectedNode, selectedEdge, reactFlowInstance, showStepSelectorPanel]);

	// Handle window resize with debouncing
	const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	useEffect(() => {
		const handleResize = () => {
			if (resizeTimeoutRef.current) {
				clearTimeout(resizeTimeoutRef.current);
			}

			resizeTimeoutRef.current = setTimeout(() => {
				if (reactFlowInstance) {
					reactFlowInstance.fitView({
						padding: 0.5,
						includeHiddenNodes: false,
						duration: 500,
					});
				}
			}, 150);
		};

		window.addEventListener("resize", handleResize);
		return () => {
			window.removeEventListener("resize", handleResize);
			if (resizeTimeoutRef.current) {
				clearTimeout(resizeTimeoutRef.current);
			}
		};
	}, [reactFlowInstance]);

	const highlightSelectedEdge = useCallback(
		(edge: Edge): Edge => {
			if (!selectedEdge) return edge;

			if (edge.id === selectedEdge.id) {
				return {
					...edge,
					style: {
						...edge.style,
						stroke: "#3b82f6", // Tailwind blue-500
						strokeWidth: 3,
					},
					className: `${edge.className || ""} selected-edge`.trim(),
				};
			}

			return edge;
		},
		[selectedEdge],
	);

	// Function to render the appropriate panel based on node type
	const renderNodePanel = () => {
		if (!selectedNode) return null;

		const commonProps = {
			node: selectedNode,
			updateNodeConfig: (config: any) =>
				updateNodeConfig(selectedNode.id, config),
			updateNodeLabel: (label: string) =>
				updateNodeLabel(selectedNode.id, label),
			updateNodeData: (data: Partial<any>) => {
				console.log("Node data updated:", {
					nodeId: selectedNode.id,
					data,
				});
				setNodes((nds) => {
					return nds.map((node) => {
						if (node.id === selectedNode.id) {
							const updatedNode = {
								...node,
								data: {
									...node.data,
									...data,
								},
							};

							if (onNodeUpdate) {
								onNodeUpdate(updatedNode).catch((error) => {
									console.error("Error updating node data:", error);
									toast.error("Failed to update step data in the backend");
								});
							}

							return updatedNode;
						}
						return node;
					});
				});
			},
			edges,
			nodes,
			updateEdge: (edgeId: string, data: any) => {
				console.log("Edge data updated from Panel:", { edgeId, data });
				setEdges((eds) => {
					return eds.map((edge) => {
						if (edge.id === edgeId) {
							const updatedEdge = {
								...edge,
								data: {
									...edge.data,
									...data,
								},
							};

							if (onEdgeUpdate) {
								onEdgeUpdate(updatedEdge).catch((error) => {
									console.error("Error updating edge data:", error);
									toast.error(
										"Failed to update connection data in the backend",
									);
								});
							}

							return updatedEdge;
						}
						return edge;
					});
				});
			},
			onConnectionPrioritiesUpdate,
		};

		switch (selectedNode.data.type) {
			case "channel":
				return <ChannelPanel key={selectedNode.id} {...commonProps} />;
			case "trigger":
				return <TriggerPanel key={selectedNode.id} {...commonProps} />;
			case "scheduler-trigger":
				return <SchedulerTriggerPanel key={selectedNode.id} {...commonProps} />;
			case "wait":
				return <WaitPanel key={selectedNode.id} {...commonProps} />;
			default:
				return <ChannelPanel key={selectedNode.id} {...commonProps} />;
		}
	};

	return (
		<div className="flex h-full w-full overflow-hidden">
			{/* ReactFlow Canvas */}
			<div
				className={`relative h-full bg-muted/50 transition-all duration-300 ${
					isPanelOpen ? "w-full sm:w-[calc(100%-532px)]" : "w-full"
				}`}
				ref={reactFlowWrapper}
			>
				{/* @ts-ignore */}
				<style jsx global>{`
  .edge-label-hover-container .react-flow__edge:not(.has-conditions):hover .react-flow__edge-textbg {
    fill: #22c55e !important;
    transition: fill 0.2s ease;
  }

  .react-flow__node:hover .group-hover\\:opacity-100 {
    opacity: 1 !important;
  }
`}</style>
				<HeaderBar
					title={journeyTitle}
					isEditing={isEditingTitle}
					isActive={isActive}
					isSave={isSave ?? false}
					onTitleChange={onTitleChange}
					onTitleBlur={onTitleBlur}
					onEditToggle={onEditToggle}
					onToggleActivation={onToggleActivation}
				/>
				<ReactFlow
					nodes={nodes}
					edges={edges.map(highlightSelectedEdge)}
					onNodesChange={onNodesChange}
					onEdgesChange={onEdgesChange}
					onConnect={onConnect}
					onConnectStart={onConnectStart}
					onConnectEnd={onConnectEnd}
					onInit={setReactFlowInstance}
					onDrop={onDrop}
					onDragOver={onDragOver}
					onNodeClick={onNodeClick}
					onEdgeClick={onEdgeClick}
					onPaneClick={onPaneClick}
					nodeTypes={nodeTypes}
					fitView
					fitViewOptions={{ padding: 1.5 }}
					snapToGrid
					snapGrid={[15, 15]}
					defaultViewport={{ x: 0, y: 0, zoom: 0.11 }}
					defaultEdgeOptions={{
						type: "default",
						style: {
							strokeWidth: 1,
							stroke: "#aaa",
							strokeDasharray: "5 5", // Dashed line for edges without conditions
						},
					}}
					// Disable node deletion via keyboard for all nodes
					deleteKeyCode={null}
					className="edge-label-hover-container bg-background"
					nodesDraggable={true}
					nodesConnectable={true}
					elementsSelectable={true}
					minZoom={0.1}
					maxZoom={2}
					preventScrolling={true}
					zoomOnScroll={true}
					zoomOnPinch={true}
					panOnScroll={false}
					panOnDrag={true}
					selectNodesOnDrag={false}
					onlyRenderVisibleElements={false}
				>
					<Controls className="!shadow-none top-5" />
					<Background gap={16} size={1} />
				</ReactFlow>
			</div>

			{/* Step Selector Panel - Shows FIRST for pending nodes */}
			{showStepSelectorPanel && (
				<div className="flex min-h-0 w-full flex-col border-border border-l bg-card shadow-lg sm:w-[532px]">
					<div className="flex h-16 items-center justify-between border-b p-4">
						<h3 className="font-semibold text-lg">Choose Node Type</h3>
						<Button
							variant="ghost"
							size="icon"
							onClick={() => {
								setPendingNodeId(null);
								setShowStepSelectorPanel(false);
								setPendingConnection(null); // Clear pending connection
							}}
							title="Close panel"
						>
							<X className="h-4 w-4" />
						</Button>
					</div>
					<StepSelectorPanel
						onSelect={async (type) => {
							if (pendingNodeId) {
								const updatedNode = await updateNodeType(pendingNodeId, type);

								if (updatedNode && pendingConnection) {
									// Now create the edge with proper direction based on node types
									const sourceNode = nodes.find(
										(n) => n.id === pendingConnection.sourceNodeId,
									);

									if (sourceNode && updatedNode) {
										// Validate the connection before creating the edge
										if (validateConnection(sourceNode, updatedNode)) {
											const {
												source: finalSourceNode,
												target: finalTargetNode,
											} = adjustEdgeDirection(sourceNode, updatedNode);

											// Find existing connections from the same source node to determine next priority
											const existingConnectionsFromSource = edges.filter(
												(e) => e.source === finalSourceNode.id,
											);
											const maxPriority =
												existingConnectionsFromSource.length > 0
													? Math.max(
															...existingConnectionsFromSource.map(
																(e) => e.data?.priority || 1,
															),
														)
													: 0;
											const newPriority = maxPriority + 1;

											// Create the connection with no default conditions
											const newEdge = {
												id: `e-${finalSourceNode.id}-${finalTargetNode.id}`,
												source: finalSourceNode.id,
												target: finalTargetNode.id,
												type: "default",
												animated: false,
												style: {
													strokeWidth: 1,
													strokeDasharray: "5 5",
												},
												data: {
													conditions: [],
													condition_type: "all",
													priority: newPriority,
													ruleNotAllowed: isTriggerType(
														finalSourceNode.data.type,
													),
												},
												label: isTriggerType(finalSourceNode.data.type)
													? ""
													: "Configure Connection",
												labelStyle: {
													fill: "#fff",
													fontSize: 12,
													fontWeight: 500,
												},
												labelBgStyle: {
													fill: "#aaa",
													fillOpacity: 1,
													rx: 10,
													ry: 10,
													padding: 5,
												},
												labelBgPadding: [8, 4] as [number, number],
												labelShowBg: true,
												labelBgBorderRadius: 4,
												className: "edge-label-hover",
											};

											// Create the edge in the backend if callback provided
											let updatedEdge: Edge = newEdge;
											if (onEdgeCreate) {
												const createdEdge = await onEdgeCreate(
													newEdge,
													finalSourceNode,
													finalTargetNode,
												);
												if (createdEdge) {
													updatedEdge = createdEdge as Edge;
												}
											}

											setEdges((eds) => {
												const updatedEdges = addEdge(updatedEdge, eds);
												console.log(
													"Edge added after type selection:",
													updatedEdge,
												);
												return updatedEdges;
											});
										} else {
											// Validation failed - show a toast but keep the node
											console.log(
												"Connection validation failed, keeping node without connection",
											);
										}
									}

									// Clear pending connection regardless of validation result
									setPendingConnection(null);
								}

								if (updatedNode) {
									requestIdleCallback(() => {
										setSelectedNode(updatedNode);
									});
								}

								setPendingNodeId(null);
								setShowStepSelectorPanel(false);
							} else {
								// Create a new start node with the selected type
								let config: any;
								if (type === "channel") {
									config = {
										composition: "",
										channel: "",
										trackConversion: false,
										conditions: [],
									};
								} else if (type === "trigger") {
									config = {
										entity: null,
										attribute: null,
										event: null,
										enabled: true,
									};
								} else if (type === "scheduler-trigger") {
									config = {
										enabled: true,
										scheduleDate: new Date().toISOString().split("T")[0],
										scheduleTime: "09:00",
									};
								} else if (type === "wait") {
									config = {
										delay: { days: 0, hours: 0, minutes: 0 },
										scheduledDate: new Date().toISOString().split("T")[0],
										scheduledTime: "09:00",
										mode: "delay",
										enabled: true,
									};
								}

								const newNode: Node = {
									id: "start",
									type: type as
										| "channel"
										| "trigger"
										| "scheduler-trigger"
										| "wait",
									position: { x: 500, y: 300 }, // Center position
									data: {
										label: "Start",
										type,
										isStart: true,
										config,
									},
								};
								(async () => {
									let createdNode = newNode;
									if (onNodeCreate) {
										const result = await onNodeCreate(newNode);
										if (!result) {
											toast.error("Failed to create starting node");
											return;
										}
										createdNode = result;
									}

									setNodes((nds) => nds.concat(createdNode));
									setSelectedNode(createdNode);
									setIsInitialized(true);
								})();

								setShowStepSelectorPanel(false);
							}
						}}
						onClose={() => {
							setPendingNodeId(null);
							setShowStepSelectorPanel(false);
							setPendingConnection(null); // Clear pending connection
						}}
					/>
				</div>
			)}

			{/* Step Configuration Panel - Shows AFTER type selection */}
			{selectedNode && !showStepSelectorPanel && (
				<div className="flex min-h-0 w-full flex-col border-border border-l bg-card shadow-lg sm:w-[532px]">
					<div className="flex h-16 items-center justify-between border-b p-4">
						<h3 className="font-semibold text-lg">Configure Step</h3>
						<div className="flex gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => {
									if (!selectedNode) return;
									setPendingNodeId(selectedNode.id);
									setPendingConnection(null);
									setSelectedEdge(null);
									setShowStepSelectorPanel(true);
								}}
								title="Change step type"
							>
								Change type
							</Button>
							{!isStartNode && (
								<Button
									variant="outline"
									size="icon"
									onClick={deleteNode}
									title="Delete step"
								>
									<Trash2 className="h-4 w-4" />
								</Button>
							)}
							<Button
								variant="ghost"
								size="icon"
								onClick={() => setSelectedNode(null)}
								title="Close panel"
							>
								<X className="h-4 w-4" />
							</Button>
						</div>
					</div>
					{renderNodePanel()}
				</div>
			)}

			{/* Connection Configuration Panel */}
			{selectedEdge && !showStepSelectorPanel && (
				<div className="flex min-h-0 w-full flex-col border-border border-l bg-card shadow-lg sm:w-[532px]">
					<div className="flex h-16 flex-shrink-0 items-center justify-between border-b p-4">
						<h3 className="font-semibold text-lg">Configure Connection</h3>
						<div className="flex gap-2">
							<Button
								variant="outline"
								size="icon"
								onClick={deleteEdge}
								title="Delete connection"
							>
								<Trash2 className="h-4 w-4" />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								onClick={() => setSelectedEdge(null)}
								title="Close panel"
							>
								<X className="h-4 w-4" />
							</Button>
						</div>
					</div>
					<ConnectionPanel
						key={selectedEdge.id}
						edge={selectedEdge}
						updateEdgeConditions={(data) =>
							updateEdgeConditions(selectedEdge.id, data)
						}
					/>
				</div>
			)}
		</div>
	);
}
