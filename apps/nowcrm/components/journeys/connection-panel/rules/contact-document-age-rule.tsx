"use client";

import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { Condition } from "../connection-panel";

interface ContactDocumentAgeRuleProps {
	condition: Condition;
	updateCondition: (id: string, updates: Partial<Condition>) => void;
}

export function ContactDocumentAgeRule({
	condition,
	updateCondition,
}: ContactDocumentAgeRuleProps) {
	// Get days value from condition.value or additional_data
	const daysValue =
		condition.additional_data?.days ??
		(typeof condition.value === "string" ? parseInt(condition.value, 10) : null) ??
		90;

	// Get operator from condition.operator or default to $lt (less than = older than)
	const operator = condition.operator || "$lt";

	const handleDaysChange = (days: number) => {
		updateCondition(condition.id, {
			value: String(days),
			additional_data: {
				...condition.additional_data,
				days,
			},
		});
	};

	const handleOperatorChange = (op: string) => {
		updateCondition(condition.id, {
			operator: op,
		});
	};

	return (
		<div className="space-y-4">
			{/* Operator dropdown */}
			<div>
				<label className="mb-1 block text-muted-foreground text-sm">
					Operator
				</label>
				<Select value={operator} onValueChange={handleOperatorChange}>
					<SelectTrigger className="w-full">
						<SelectValue placeholder="Select operator" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="$lt">
							Older than (more than X days ago)
						</SelectItem>
						<SelectItem value="$lte">
							Older than or equal to (X or more days ago)
						</SelectItem>
						<SelectItem value="$gt">
							Newer than (less than X days ago)
						</SelectItem>
						<SelectItem value="$gte">
							Newer than or equal to (X or fewer days ago)
						</SelectItem>
						<SelectItem value="$eq">Exactly X days ago</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Days input */}
			<div>
				<label className="mb-1 block text-muted-foreground text-sm">
					Number of Days
				</label>
				<Input
					type="number"
					min={0}
					value={daysValue}
					onChange={(e) => {
						const days = parseInt(e.target.value, 10) || 0;
						handleDaysChange(days);
					}}
					placeholder="90"
				/>
				<p className="mt-1 text-muted-foreground text-xs">
					Check if a contact document was created{" "}
					{operator === "$lt" || operator === "$lte"
						? "more than"
						: operator === "$gt" || operator === "$gte"
							? "less than"
							: "exactly"}{" "}
					{daysValue} days ago
				</p>
			</div>
		</div>
	);
}
