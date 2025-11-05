import {
	type DocumentId,
	type JourneyStep,
	type JourneyStepConnection,
	type JourneyStepRuleScore,
	ServiceResponse,
} from "@nowcrm/services";
import { processRules } from "./processRules";

export async function processStepConnections(
	connections: JourneyStepConnection[], // they come here sorted by priority
	contactId: DocumentId,
): Promise<
	ServiceResponse<{
		target_step: JourneyStep;
		total_score: number;
		score_items: JourneyStepRuleScore[];
	} | null>
> {
	for (const connection of connections) {
		if (connection.journey_step_rules.length === 0) {
			return ServiceResponse.success("found connection with passed rules", {
				target_step: connection.target_step,
				total_score: 0,
				score_items: [],
			});
		}
		const connection_rules = await processRules(
			connection.journey_step_rules,
			contactId,
			connection.condition_type,
		);
		if (connection_rules.responseObject?.rulePassed) {
			return ServiceResponse.success("found connection with passed rules", {
				target_step: connection.target_step,
				total_score: connection_rules.responseObject.totalScore,
				score_items: connection_rules.responseObject.scoreItems,
			});
		}
	}

	return ServiceResponse.failure("No connections passed rules", null);
}
