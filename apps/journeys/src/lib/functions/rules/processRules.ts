import {
	type DocumentId,
	type JourneyStepRule,
	type JourneyStepRuleScore,
	ServiceResponse,
} from "@nowcrm/services";
import { applyRule } from "./applyRule";

export async function processRules(
	rules: JourneyStepRule[],
	contactId: DocumentId,
	condition_type: "all" | "any",
): Promise<
	ServiceResponse<{
		totalScore: number;
		rulePassed: boolean;
		scoreItems: JourneyStepRuleScore[];
	} | null>
> {
	if (!rules)
		return ServiceResponse.success("no rules,return true", {
			totalScore: 0,
			rulePassed: true,
			scoreItems: [],
		});
	let totalScore = 0;
	let scoreItems: JourneyStepRuleScore[] = [];
	let passedCount = 0;

	for (const rule of rules) {
		const passed = await applyRule(rule, contactId);

		if (passed) {
			passedCount++;
			if (rule.journey_step_rule_scores) {
				totalScore +=
					rule.journey_step_rule_scores?.reduce((acc, item) => {
						return acc + (+item.value || 0);
					}, 0) || 0;

				scoreItems = scoreItems.concat(rule.journey_step_rule_scores);
			}
		}
	}

	const rulePassed =
		condition_type === "all" ? passedCount === rules.length : passedCount > 0;

	return ServiceResponse.success("rules processed", {
		totalScore,
		rulePassed,
		scoreItems,
	});
}
