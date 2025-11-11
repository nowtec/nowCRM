"use server";

import { auth } from "@/auth";
import { checkDocumentId, CommunicationChannel, DocumentId, Form_Journey, Form_JourneyStep, Form_JourneyStepConnection, Form_JourneyStepRule, Form_JourneyStepRuleScore, Journey, JourneyStep } from "@nowcrm/services";
import { handleError, journeysService, journeyStepConnectionsService, journeyStepRuleScoresService, journeyStepRulesService, journeyStepsService, StandardResponse } from "@nowcrm/services/server";

export async function updateJourney(
	journeyId: DocumentId,
	data: Partial<Form_Journey>,
): Promise<StandardResponse<Journey>> {
	const session = await auth();
	if (!session) {
		return {
			data: null,
			status: 403,
			success: false,
		};
	}

	try {
		return await journeysService.update(journeyId,data, session.jwt);
	} catch (error) {
		return handleError(error);
	}
}

export async function activateJourney(
	journeyId: DocumentId,
	active: boolean,
): Promise<StandardResponse<any>> {
	const session = await auth();
	if (!session) {
		return {
			data: null,
			status: 403,
			success: false,
		};
	}

	const journey = await journeysService.findOne(journeyId, session.jwt, {
		populate: {
			journey_steps: {
				populate: {
					composition: true,
					channel: true,
					identity: true,
				},
			},
		},
	});

	// Collect invalid steps and why each one failed
	const invalidSteps: Array<{ name: string; reasons: string[] }> = [];

	if (journey.data?.journey_steps?.length) {
		for (const step of journey.data.journey_steps) {
			const reasons: string[] = [];
			if (step.type === "channel") {
				if (!step.composition) {
					reasons.push("missing composition");
				}
				if (!step.channel) {
					reasons.push("missing channel");
				}

				// Only check identity if it's email
				const channelName = step.channel?.name;
				const isEmail = Boolean(
					channelName &&
						channelName.toLowerCase() ===
							CommunicationChannel.EMAIL.toLowerCase(),
				);
				if (isEmail && !step.identity) {
					reasons.push("missing identity for email channel");
				}
			}
			if (step.type === "trigger") {
				if (!step.additional_data?.entity) {
					reasons.push("missing entity");
				}

				if (!step.additional_data?.event) {
					reasons.push("missing event");
				}
			}
			if (step.type === "scheduler-trigger") {
				if (step.timing?.type === "publish" && !step.timing?.value) {
					reasons.push("missing date for scheduler trigger");
				}
			}

			if (step.type === "wait") {
				if (!step.timing?.value) {
					switch (step.timing?.type) {
						case "delay":
							reasons.push("missing delay duration");
							break;
						case "publish":
							reasons.push("missing date and time for wait step");
							break;
						default:
							break;
					}
				}
			}

			if (reasons.length > 0) {
				invalidSteps.push({
					name: step.name,
					reasons,
				});
			}
		}
	} else {
		invalidSteps.push({
			name: "(No journey_steps found)",
			reasons: ["no journey_steps returned from DB"],
		});
	}

	// If any invalid steps, return 400 with detailed reasons
	if (invalidSteps.length > 0) {
		const detailStrings = invalidSteps.map(
			({ name, reasons }) => `${name}: ${reasons.join(", ")}`,
		);
		return {
			data: null,
			status: 400,
			success: false,
			errorMessage: `Steps with invalid data: ${detailStrings.join("; ")}`,
		};
	}

	try {
		return await journeysService.update(journeyId, { active }, session.jwt);
	} catch (error) {
		return handleError(error);
	}
}

// Create a new step
export async function createStep(
	data: Form_JourneyStep,
): Promise<StandardResponse<JourneyStep>> {
	const session = await auth();
	if (!session) {
		return {
			data: null,
			status: 403,
			success: false,
		};
	}

	try {
		// Add publishedAt date if not provided
		if (!data.publishedAt) {
			data.publishedAt = new Date();
		}

		return await journeyStepsService.create(data, session.jwt);
	} catch (error) {
		return handleError(error);
	}
}

// Update an existing step
export async function updateStep(
	stepId: DocumentId,
	data: Partial<Form_JourneyStep>,
): Promise<StandardResponse<any>> {
	const session = await auth();
	if (!session) {
		return {
			data: null,
			status: 403,
			success: false,
		};
	}
	try {
		return await journeyStepsService.update(stepId, data, session.jwt);
	} catch (error) {
		return handleError(error);
	}
}

// Delete a step
export async function deleteStep(
	stepId: DocumentId,
): Promise<StandardResponse<any>> {
	const session = await auth();
	if (!session) {
		return {
			data: null,
			status: 403,
			success: false,
		};
	}

	try {
		//clear all connection to this node
		const connects = await journeyStepConnectionsService.findAll(session.jwt, {
			filters: {
				target_step: { documentId: { $eq: stepId } },
			},
		});
		connects.data?.map(async (item) => {
			await journeyStepConnectionsService.delete(item.documentId, session.jwt);
		});
		return await journeyStepsService.delete(stepId, session.jwt);
	} catch (error) {
		return handleError(error);
	}
}

// Update connection priorities
export async function updateConnectionPriorities(
	connectionPriorities: { connectionId: DocumentId; priority: number }[],
): Promise<StandardResponse<any>> {
	const session = await auth();
	if (!session) {
		return {
			data: null,
			status: 403,
			success: false,
			errorMessage: "Not authenticated",
		};
	}

	try {
		// Update each connection with its new priority
		const updatePromises = connectionPriorities.map(
			({ connectionId, priority }) =>
				journeyStepConnectionsService.update(connectionId, { priority }, session.jwt),
		);

		await Promise.all(updatePromises);

		return {
			data: true,
			status: 200,
			success: true,
		};
	} catch (error) {
		return handleError(error);
	}
}

// Create a new connection between steps
export async function createConnection(
	data: Form_JourneyStepConnection,
): Promise<StandardResponse<any>> {
	const session = await auth();
	if (!session) {
		return {
			data: null,
			status: 403,
			success: false,
		};
	}

	try {
		// Add publishedAt date if not provided
		if (!data.publishedAt) {
			data.publishedAt = new Date();
		}

		return await journeyStepConnectionsService.create(data, session.jwt);
	} catch (error) {
		return handleError(error);
	}
}

// Update an existing connection
export async function updateConnection(
	connectionId: DocumentId,
	data: Partial<Form_JourneyStepConnection>,
): Promise<StandardResponse<any>> {
	const session = await auth();
	if (!session) {
		return {
			data: null,
			status: 403,
			success: false,
		};
	}

	try {
		return await journeyStepConnectionsService.update(connectionId, data, session.jwt);
	} catch (error) {
		return handleError(error);
	}
}

// Delete a connection
export async function deleteConnection(
	connectionId: DocumentId,
): Promise<StandardResponse<any>> {
	const session = await auth();
	if (!session) {
		return {
			data: null,
			status: 403,
			success: false,
		};
	}

	try {
		return await journeyStepConnectionsService.delete(connectionId, session.jwt);
	} catch (error) {
		return handleError(error);
	}
}

// Create a rule for a connection
export async function createRule(
	data: Form_JourneyStepRule,
): Promise<StandardResponse<any>> {
	const session = await auth();
	if (!session) {
		return {
			data: null,
			status: 403,
			success: false,
		};
	}

	try {
		// Add publishedAt date if not provided
		if (!data.publishedAt) {
			data.publishedAt = new Date();
		}

		return await journeyStepRulesService.create(data, session.jwt);
	} catch (error) {
		return handleError(error);
	}
}

// Create a rule score
export async function createRuleScore(
	data: Form_JourneyStepRuleScore,
): Promise<StandardResponse<any>> {
	const session = await auth();
	if (!session) {
		return {
			data: null,
			status: 403,
			success: false,
		};
	}

	try {
		// Add publishedAt date if not provided
		if (!data.publishedAt) {
			data.publishedAt = new Date();
		}

		return await journeyStepRuleScoresService.create(data, session.jwt);
	} catch (error) {
		return handleError(error);
	}
}

// Update connection rules
export async function updateConnectionRules(
	connectionId: DocumentId,
	rules: {
		documentId?: DocumentId;
		condition: string;
		condition_operator: string;
		ready_condition: string;
		additional_condition: string;
		additional_data: string;
		label: string;
		condition_value: string;
		scores?: { documentId?: DocumentId; attribute: string; value: string }[];
	}[],
	condition_type: "all" | "any",
): Promise<StandardResponse<any>> {
	const session = await auth();
	if (!session) {
		return {
			data: null,
			status: 403,
			success: false,
		};
	}

	try {
		// First, update the connection with the condition type
		const connectionUpdateResult = await journeyStepConnectionsService.update(
			connectionId,
			{
				condition_type: condition_type,
			},
			session.jwt,
		);

		if (!connectionUpdateResult.success) {
			return connectionUpdateResult;
		}

		// Get existing rules for this connection
		const existingRulesResponse = await journeyStepRulesService.findAll(session.jwt, {
			filters: { journeys_step_connection: { documentId: { $eq: connectionId } } },
			populate: {
				journey_step_rule_scores: true,
			},
		});

		if (!existingRulesResponse.success || !existingRulesResponse.data) {
			return {
				data: null,
				status: 500,
				success: false,
				errorMessage: "Failed to fetch existing rules",
			};
		}

		const existingRules = existingRulesResponse.data;

		// Create a map of existing rule IDs
		const existingRuleIds = new Set(existingRules.map((rule) => rule.documentId));

		// Process each rule
		for (const rule of rules) {
			if (rule.documentId && checkDocumentId(rule.documentId)) {
				// Rule exists, update it
				existingRuleIds.delete(rule.documentId);
				await journeyStepRulesService.update(rule.documentId, {
					condition: rule.condition,
					condition_operator: rule.condition_operator,
					ready_condition: rule.ready_condition,
					additional_data: rule.additional_data,
					additional_condition: rule.additional_condition,
					condition_value:
						typeof rule.condition_value === "object"
							? JSON.stringify(rule.condition_value)
							: rule.condition_value,
					label: rule.label,
				}, session.jwt);

				// Handle scores for this rule
				if (rule.scores && rule.scores.length > 0) {
					// Get existing scores for this rule
					const existingScores =
						existingRules.find((r) => r.documentId === rule.documentId)
							?.journey_step_rule_scores || [];

					const existingScoreIds = new Set(
						existingScores.map((score) => score.documentId),
					);

					// Process each score
					for (const score of rule.scores) {
						if (score.documentId) {
							// Score exists, update it
							existingScoreIds.delete(score.documentId);

							await journeyStepRuleScoresService.update(score.documentId, {
								name: score.attribute,
								value: score.value,
							}, session.jwt);
						} else {
							// Create new score
							await journeyStepRuleScoresService.create({
								journey_step_rule: rule.documentId,
								name: score.attribute,
								value: score.value,
								publishedAt: new Date(),
							}, session.jwt);
						}
					}

					// Delete scores that no longer exist
					for (const scoreId of existingScoreIds) {
						await journeyStepRuleScoresService.delete(scoreId, session.jwt);
					}
				} else {
					// No scores provided, delete all existing scores for this rule
					const existingScores =
						existingRules.find((r) => r.documentId === rule.documentId)
							?.journey_step_rule_scores || [];

					for (const score of existingScores) {
						await journeyStepRuleScoresService.delete(score.documentId, session.jwt);
					}
				}
			} else {
				// Create new rule
				const newRuleResult = await journeyStepRulesService.create({
					journeys_step_connection: connectionId,
					condition: rule.condition,
					condition_operator: rule.condition_operator,
					condition_value: rule.condition_value,
					label: rule.label,
					ready_condition: rule.ready_condition,
					additional_data: rule.additional_data,
					additional_condition: rule.additional_condition,
					publishedAt: new Date(),
				}, session.jwt);

				if (
					newRuleResult.success &&
					newRuleResult.data &&
					rule.scores &&
					rule.scores.length > 0
				) {
					// Create scores for the new rule
					for (const score of rule.scores) {
						await journeyStepRuleScoresService.create({
							journey_step_rule: newRuleResult.data.documentId,
							name: score.attribute,
							value: score.value,
							publishedAt: new Date(),
						}, session.jwt);
					}
				}
			}
		}

		// Delete rules that no longer exist
		for (const ruleId of existingRuleIds) {
			await journeyStepRulesService.delete(ruleId, session.jwt);
		}

		return {
			data: true,
			status: 200,
			success: true,
		};
	} catch (error) {
		return handleError(error);
	}
}
