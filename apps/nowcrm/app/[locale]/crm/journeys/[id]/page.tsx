import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import type { Edge, Node } from "reactflow";
import { isValidTimeZone } from "@/lib/is-valid-timezone";
import JourneyClient from "./client";
import { journeysService } from "@nowcrm/services/server";
import { checkDocumentId, DocumentId, Journey, JourneyStep, JourneyStepConnection } from "@nowcrm/services";
import { auth } from "@/auth";

export default async function JourneyPage(props: {
	params: Promise<{ id: DocumentId }>;
}) {
	const params = await props.params;
	const journeyId =params.id;
	const session = await auth();
	if (checkDocumentId(journeyId)) {
		return notFound();
	}

	const journeyResponse = await journeysService.findOne(journeyId, session?.jwt, {
		populate: {
			journey_steps: {
				populate: {
					connections_from_this_step: {
						populate: {
							target_step: true,
							source_step: true,
							journey_step_rules: {
								populate: {
									journey_step_rule_scores: true,
								},
							},
						},
					},
					connections_to_this_step: {
						populate: {
							source_step: true,
							journey_step_rules: {
								populate: {
									journey_step_rule_scores: true,
								},
							},
						},
					},
					channel: true,
					composition: true,
					contacts: true,
					identity: true,
					additional_data: true,
					type: true,
				},
			},
		},
	});

	if (!journeyResponse.success || !journeyResponse.data) {
		return notFound();
	}

	const journey: Journey = journeyResponse.data;

	const cookieTz = (await cookies()).get("tz")?.value;
	const tz = isValidTimeZone(cookieTz) ? cookieTz! : "UTC";

	const { nodes, edges } = convertJourneyToReactFlow(journey, tz);
	return (
		<JourneyClient
			journeyId={journeyId}
			initialTitle={journey.name}
			initialActive={journey.active}
			initialNodes={nodes}
			initialEdges={edges}
		/>
	);
}

interface LayoutNode {
	id: string;
	children: string[];
	parents: string[];
	step: JourneyStep;
}

function buildGraph(steps: JourneyStep[]): Map<string, LayoutNode> {
	const graph = new Map<string, LayoutNode>();
	for (const step of steps) {
		graph.set(`step-${step.id}`, {
			id: `step-${step.id}`,
			children: [],
			parents: [],
			step,
		});
	}
	for (const step of steps) {
		const sourceId = `step-${step.id}`;
		for (const conn of step.connections_from_this_step ?? []) {
			if (!conn.target_step) continue;
			const targetId = `step-${conn.target_step.id}`;
			graph.get(sourceId)?.children.push(targetId);
			graph.get(targetId)?.parents.push(sourceId);
		}
	}
	return graph;
}

function layoutGraphHorizontally(graph: Map<string, LayoutNode>) {
	const positions = new Map<string, { x: number; y: number }>();
	const inDegree = new Map<string, number>();
	const levelMap = new Map<string, number>();

	for (const [id, node] of graph) {
		inDegree.set(id, node.parents.length);
	}

	const queue: string[] = [];
	for (const [id, count] of inDegree) {
		if (count === 0) {
			queue.push(id);
			levelMap.set(id, 0);
		}
	}

	while (queue.length) {
		const currentId = queue.shift()!;
		const currentLevel = levelMap.get(currentId)!;
		for (const childId of graph.get(currentId)!.children) {
			const currentIn = inDegree.get(childId)! - 1;
			inDegree.set(childId, currentIn);
			if (currentIn === 0) {
				queue.push(childId);
				levelMap.set(childId, currentLevel + 1);
			}
		}
	}

	// 🔁 Adjust trigger/scheduler-trigger node levels based on their targets
	for (const [id, node] of graph.entries()) {
		const type = node.step.type;
		if (type === "trigger" || type === "scheduler-trigger") {
			const childLevels = node.children.map((cid) => levelMap.get(cid) ?? 1);
			if (childLevels.length > 0) {
				const targetLevel = Math.min(...childLevels);
				const newLevel = Math.max(0, targetLevel - 1); // prevent negative levels
				levelMap.set(id, newLevel);
			}
		}
	}

	// Group by levels again after update
	const levelGroups = new Map<number, string[]>();
	for (const [id, level] of levelMap) {
		if (!levelGroups.has(level)) levelGroups.set(level, []);
		levelGroups.get(level)!.push(id);
	}

	const COLUMN_SPACING = 400;
	const ROW_SPACING = 200;
	for (const [level, ids] of levelGroups.entries()) {
		ids.forEach((id, index) => {
			positions.set(id, {
				x: level * COLUMN_SPACING,
				y: index * ROW_SPACING,
			});
		});
	}

	return positions;
}
function convertJourneyToReactFlow(
	journey: Journey,
	tz: string,
): {
	nodes: Node[];
	edges: Edge[];
} {
	const nodes: Node[] = [];
	const edges: Edge[] = [];
	if (!journey.journey_steps || journey.journey_steps.length === 0) {
		return { nodes, edges };
	}

	const graph = buildGraph(journey.journey_steps);
	const positions = layoutGraphHorizontally(graph);

	// Helper: convert a UTC date-like input to local YYYY-MM-DD and HH:mm using timezone offset
	function toLocalDateParts(
		input: Date | string | number,
		tz: string,
	): { date: string; time: string } {
		const d = new Date(input);
		if (Number.isNaN(d.getTime())) {
			// Fallback to "today 09:00" in the tz
			const dateStr = new Intl.DateTimeFormat("en-CA", {
				timeZone: tz,
				year: "numeric",
				month: "2-digit",
				day: "2-digit",
			}).format(new Date());
			return { date: dateStr, time: "09:00" };
		}

		const dateStr = new Intl.DateTimeFormat("en-CA", {
			timeZone: tz,
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
		}).format(d); // YYYY-MM-DD in en-CA

		const timeStr = new Intl.DateTimeFormat("en-GB", {
			timeZone: tz,
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
		}).format(d); // HH:mm in en-GB

		// Some engines include a leading space; normalize
		return { date: dateStr.trim(), time: timeStr.trim() };
	}

	journey.journey_steps.forEach((step: JourneyStep) => {
		const position = positions.get(`step-${step.id}`) || { x: 100, y: 100 };

		let config: any = {};
		switch (step.type) {
			case "channel":
				config = {
					composition: step.composition
						? {
								label: step.composition.name,
								value: step.composition.id.toString(),
							}
						: undefined,
					identity: step.identity
						? {
								label: step.identity.name,
								value: step.identity.id.toString(),
							}
						: undefined,
					channel: step.channel
						? {
								label: step.channel.name,
								value: step.channel.id.toString(),
							}
						: undefined,
					trackConversion: false,
					conditions: [],
				};
				break;

			case "trigger":
				config = {
					entity: step.additional_data?.entity || null,
					attribute: step.additional_data?.attribute || null,
					event: step.additional_data?.event || null,
					enabled: step.additional_data?.enabled !== false,
				};
				break;

			case "scheduler-trigger": {
				const isPublish = step.timing?.type === "publish" && step.timing?.value;
				let scheduledDate = "";
				let scheduledTime = "";

				if (isPublish) {
					const { date, time } = toLocalDateParts(
						step.timing!.value as Date | string | number,
						tz,
					);
					scheduledDate = date;
					scheduledTime = time;
				} else {
					// Default to today's local date and 09:00 local
					const now = new Date();
					const offset = now.getTimezoneOffset() * 60000;
					const localNow = new Date(now.getTime() - offset);
					scheduledDate = localNow.toISOString().split("T")[0];
					scheduledTime = "09:00";
				}

				config = {
					enabled: step.additional_data?.enabled !== false,
					scheduledDate,
					scheduledTime,
				};
				break;
			}

			case "wait": {
				const timingValue = step.timing?.value;

				if (step.timing?.type === "delay") {
					config = {
						mode: "delay",
						enabled: step.additional_data?.enabled !== false,
						delay: timingValue
							? {
									days: Math.floor((timingValue as number) / 1440),
									hours: Math.floor(((timingValue as number) % 1440) / 60),
									minutes: (timingValue as number) % 60,
								}
							: { days: 0, hours: 0, minutes: 0 },
					};
				} else if (step.timing?.type === "publish") {
					const { date, time } = toLocalDateParts(
						timingValue as Date | string | number,
						tz,
					);
					config = {
						mode: "publish",
						enabled: step.additional_data?.enabled !== false,
						// Local parts derived from UTC input
						scheduledDate: date, // YYYY-MM-DD in local time
						scheduledTime: time, // HH:mm in local time
					};
				} else {
					config = {
						mode: "delay",
						enabled: true,
						delay: { days: 0, hours: 0, minutes: 0 },
					};
				}
				break;
			}

			default:
				console.warn("Unknown step.type in backend:", step.type);
				config = {};
		}

		nodes.push({
			id: `step-${step.id}`,
			type: step.type,
			position,
			data: {
				label: step.name,
				type: step.type,
				stepId: step.id,
				config,
				hasContacts: step.contacts && step.contacts.length > 0,
				hasIdentity: !!step.identity?.name,
			},
		});

		if (step.connections_from_this_step) {
			step.connections_from_this_step.forEach(
				(connection: JourneyStepConnection) => {
					if (!connection.target_step) return;
					const conditions =
						connection.journey_step_rules?.map((rule) => ({
							id: `condition-${rule.id}`,
							type: rule.condition,
							operator: rule.condition_operator,
							value: rule.condition_value?.includes("value")
								? JSON.parse(rule.condition_value)
								: rule.condition_value,
							label: rule.label,
							additionalCondition: rule.additional_condition,
							additional_data: rule.additional_data,
							conditionOperator: (rule.additional_data as any)
								?.conditionOperator,
							conditionField: (rule.additional_data as any)?.conditionField,
							scores:
								rule.journey_step_rule_scores?.map((score) => ({
									attribute: score.name,
									value: score.value.toString(),
								})) || [],
							showScores: rule.journey_step_rule_scores.length > 0,
						})) || [];

					edges.push({
						id: `e-step-${step.id}-step-${connection.target_step.id}`,
						source: `step-${step.id}`,
						target: `step-${connection.target_step.id}`,
						type: "default",
						animated: false,
						style: {
							strokeWidth: conditions.length > 0 ? 2 : 1,
							stroke: conditions.length > 0 ? "#22c55e" : "#aaa",
							strokeDasharray: conditions.length > 0 ? undefined : "5 5",
						},
						data: {
							conditions,
							condition_type: connection.condition_type,
							connectionId: connection.id,
							priority: connection.priority || 1,
							sourceType: connection.source_step.type,
						},
						label:
							connection.source_step.type === "trigger" ||
							connection.source_step.type === "scheduler-trigger"
								? ""
								: conditions.length > 0
									? conditions.length === 1
										? conditions[0].label
										: `All of ${conditions.length} conditions`
									: "No conditions (click to configure)",
						labelStyle: {
							fill: "#fff",
							fontSize: 12,
							fontWeight: 500,
						},
						labelBgStyle: {
							fill: conditions.length > 0 ? "#22c55e" : "#aaa",
							fillOpacity: 1,
							padding: 5,
						},
						labelBgPadding: [8, 4],
						labelShowBg: true,
						labelBgBorderRadius: 4,
						className:
							conditions.length > 0 ? "has-conditions" : "edge-label-hover",
					});
				},
			);
		}
	});

	return { nodes, edges };
}
