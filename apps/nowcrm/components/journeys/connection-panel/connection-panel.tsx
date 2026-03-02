"use client";

import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { Edge } from "reactflow";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { ActionRule } from "./rules/action-rule";
import { ContactDocumentAgeRule } from "./rules/contact-document-age-rule";
import { DonationTransactionRule } from "./rules/donation-transaction-rule";
import { FinishedJourneyRule } from "./rules/finished-journey";
import { FormAnswerRule } from "./rules/form-answer-rule";
import { FormCompleteRule } from "./rules/form-complete-rule";

export type Condition = {
	id: string;
	documentId?: string;
	type: string;
	operator: string;
	value?: string | { label: string; value: string };
	label?: string;
	scores?: Array<{
		id?: number;
		documentId?: string;
		attribute: string;
		value: string;
	}>;
	showScores?: boolean;
	//Condiiton fields neede when deep search is used
	conditionOperator?: string;
	conditionField?: string;
	additionalCondition?: string;
	additional_data?: any;
	documentType?: string; // Document type for document-related rules
};

export type ConnectionData = {
	conditions: Condition[];
	condition_type: "all" | "any";
	connectionId?: number;
};

interface ConnectionPanelProps {
	edge: Edge;
	updateEdgeConditions: (data: ConnectionData) => void;
	nodes?: any[];
}

const CONDITION_TYPES = [
	{ value: "[surveys][form_id]", label: "Form Completed" },
	{ value: "[actions][action_type]", label: "Actions" },
	{ value: "[actions][external_id]", label: "Journey Finished" },
	{ value: "[surveys][survey_items]", label: "Form Answer" },
	{ value: "[donation_transactions]", label: "Donation transaction" },
	{ value: "[contact_documents]", label: "Contact Document Age" },
];

const CONDITION_CONFIG = {
	defaultType: "[surveys][form_id]",
	defaultOperator: "$eq",
	defaultLabel: "Form Completed",
};

interface ConditionItemProps {
	condition: Condition;
	index: number;
	updateCondition: (id: string, updates: Partial<Condition>) => void;
	removeCondition: (id: string) => void;
}

const ConditionItem = ({
	condition,
	index,
	updateCondition,
	removeCondition,
}: ConditionItemProps) => {
	return (
		<div className="rounded-md border border-border bg-card p-4">
			<div className="mb-4 flex items-center justify-between">
				<div className="flex items-center gap-2">
					<span className="font-medium text-foreground text-sm">
						Rule {index + 1}
					</span>
				</div>
				<div className="flex items-center gap-1">
					<Button
						variant="ghost"
						size="icon"
						className="h-6 w-6"
						onClick={() => removeCondition(condition.id)}
						title="Remove rule"
					>
						<Trash2 className="h-4 w-4" />
					</Button>
				</div>
			</div>

			<div className="space-y-4">
				<div>
					<label className="mb-1 block text-muted-foreground text-sm">
						Type
					</label>
					<Select
						value={condition.type}
						onValueChange={(value) =>
							updateCondition(condition.id, {
								type: value,
								conditionField: undefined,
								conditionOperator: undefined,
								additional_data: undefined,
								additionalCondition: undefined,
							})
						}
					>
						<SelectTrigger className="w-full">
							<SelectValue placeholder="Select type" />
						</SelectTrigger>
						<SelectContent>
							{CONDITION_TYPES.map((type) => (
								<SelectItem key={type.value} value={type.value}>
									{type.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				{/* Render the operator/value inputs via external, type‐specific components */}
				<div>
					{condition.type === "[surveys][form_id]" && (
						<FormCompleteRule
							condition={condition}
							updateCondition={updateCondition}
						/>
					)}
				</div>
				<div>
					{condition.type === "[surveys][survey_items]" && (
						<FormAnswerRule
							condition={condition}
							updateCondition={updateCondition}
						/>
					)}
				</div>
				{condition.type === "[donation_transactions]" && (
					<DonationTransactionRule
						condition={condition}
						updateCondition={updateCondition}
					/>
				)}
				{condition.type === "[actions][external_id]" && (
					<FinishedJourneyRule
						condition={condition}
						updateCondition={updateCondition}
					/>
				)}

				{condition.type === "[actions][action_type]" && (
					<ActionRule condition={condition} updateCondition={updateCondition} />
				)}

				{condition.type === "[contact_documents]" && (
					<ContactDocumentAgeRule
						condition={condition}
						updateCondition={updateCondition}
					/>
				)}

				{/* Document Type field - shown for all rule types */}
				<div>
					<label className="mb-1 block text-muted-foreground text-sm">
						Document Type (optional)
					</label>
					<Input
						type="text"
						value={condition.documentType || ""}
						onChange={(e) =>
							updateCondition(condition.id, {
								documentType: e.target.value || undefined,
							})
						}
						placeholder="e.g., pdf, image, document (leave empty for no type)"
						className="w-full"
					/>
					<p className="mt-1 text-muted-foreground text-xs">
						Specify document type filter for this rule. Leave empty to match any
						document type.
					</p>
				</div>

				{/* Scores section (unchanged) */}
				<div>
					{condition.showScores && (
						<div className="mt-4 mb-3 space-y-3 border-border border-t pt-3">
							<div className="flex items-center justify-between">
								<h4 className="font-medium text-foreground text-sm">Scores</h4>
							</div>

							{(condition.scores || []).map((score, idx) => (
								<div key={idx} className="mb-2 flex items-center gap-2">
									<div className="grid flex-1 grid-cols-2 gap-2">
										<div>
											<label className="mb-1 block text-muted-foreground text-xs">
												Attribute
											</label>
											<Input
												type="text"
												value={score.attribute || ""}
												placeholder="Enter attribute name"
												className="h-9 text-sm"
												onChange={(e) => {
													const updatedScores = [...(condition.scores || [])];
													updatedScores[idx].attribute = e.target.value;
													updateCondition(condition.id, {
														scores: updatedScores,
													});
												}}
											/>
										</div>
										<div>
											<label className="mb-1 block text-muted-foreground text-xs">
												Value
											</label>
											<Input
												type="text"
												value={score.value || ""}
												placeholder="Enter value"
												className="h-9 text-sm"
												onChange={(e) => {
													const updatedScores = [...(condition.scores || [])];
													updatedScores[idx].value = e.target.value;
													updateCondition(condition.id, {
														scores: updatedScores,
													});
												}}
											/>
										</div>
									</div>
									<Button
										variant="ghost"
										size="icon"
										className="mt-5 h-8 w-8 text-muted-foreground hover:text-destructive"
										onClick={() => {
											const updatedScores = [...(condition.scores || [])];
											updatedScores.splice(idx, 1);

											// If no scores left, hide the score section
											if (updatedScores.length === 0) {
												updateCondition(condition.id, {
													showScores: false,
													scores: [],
												});
											} else {
												updateCondition(condition.id, {
													scores: updatedScores,
												});
											}
										}}
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</div>
							))}
						</div>
					)}

					<Button
						variant="outline"
						size="sm"
						className="mt-2 w-full"
						onClick={() => {
							if (condition.showScores) {
								// Add another score entry
								const updatedScores = [
									...(condition.scores || []),
									{ attribute: "", value: "" },
								];
								updateCondition(condition.id, { scores: updatedScores });
							} else {
								// Initialize scores array with one empty entry and show scores
								updateCondition(condition.id, {
									showScores: true,
									scores: [{ attribute: "", value: "" }],
								});
							}
						}}
					>
						<Plus className="mr-1 h-3 w-3" /> Add Score
					</Button>
				</div>
			</div>
		</div>
	);
};

export function ConnectionPanel({
	edge,
	updateEdgeConditions,
	nodes = [],
}: ConnectionPanelProps) {
	const [data, setData] = useState<ConnectionData>(
		edge.data || {
			conditions: [],
			condition_type: "all",
		},
	);

	const [hasChanges, setHasChanges] = useState(false);

	// Check if source node is a trigger
	const sourceNode = nodes.find((n) => n.id === edge.source);
	const isFromTrigger =
		sourceNode?.type === "trigger" ||
		sourceNode?.type === "scheduler-trigger" ||
		sourceNode?.data?.type === "trigger" ||
		sourceNode?.data?.type === "scheduler-trigger";

	useEffect(() => {
		const newData = edge.data || {
			conditions: [],
			condition_type: "all",
		};
		setData(newData);
		setHasChanges(false);
	}, [edge.data, edge.id]);

	const handleDataChange = (newData: Partial<ConnectionData>) => {
		const updatedData = { ...data, ...newData };
		setData(updatedData);
		setHasChanges(true);
	};

	const handleSave = () => {
		updateEdgeConditions(data);
		setHasChanges(false);
	};

	const addCondition = () => {
		const newCondition: Condition = {
			id: Date.now().toString(), // generate a simple unique ID
			type: CONDITION_CONFIG.defaultType,
			operator: CONDITION_CONFIG.defaultOperator,
			value: undefined,
			label: CONDITION_CONFIG.defaultLabel,
			scores: [],
			showScores: false,
		};
		handleDataChange({ conditions: [...data.conditions, newCondition] });
	};

	const updateCondition = (id: string, updates: Partial<Condition>) => {
		const updatedConditions = data.conditions.map((condition) => {
			if (condition.id === id) {
				const merged = { ...condition, ...updates };

				// Deep merge for additional_data
				if (updates.additional_data) {
					console.log(updates.additional_data);
					merged.additional_data = {
						...condition.additional_data,
						...updates.additional_data,
					};
				}

				if (updates.type && updates.type !== condition.type) {
					const conditionTypeDef = CONDITION_TYPES.find(
						(ct) => ct.value === updates.type,
					);
					merged.label = conditionTypeDef?.label;
					merged.value = "";
					merged.scores = [];
					merged.showScores = false;
				}

				if (
					updates.value &&
					typeof updates.value !== "string" &&
					merged.value
				) {
					merged.value = JSON.stringify(updates.value);
				}
				return merged;
			}
			return condition;
		});
		handleDataChange({ conditions: updatedConditions });
	};

	const removeCondition = (id: string) => {
		const updatedConditions = data.conditions.filter(
			(condition) => condition.id !== id,
		);
		handleDataChange({ conditions: updatedConditions });
	};

	// Helper function to get rule display text
	const getRuleDisplayText = (condition: Condition): string => {
		const typeLabel =
			CONDITION_TYPES.find((t) => t.value === condition.type)?.label ||
			condition.type;
		if (condition.label) {
			return `${typeLabel}: ${condition.label}`;
		}
		return typeLabel;
	};

	return (
		<div className="relative min-h-0 flex-1 overflow-hidden">
			<div className="h-full overflow-y-auto p-4">
				{/* Show rule summary box when connecting from trigger */}
				{isFromTrigger && data.conditions.length > 0 && (
					<div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
						<div className="mb-2 font-medium text-blue-900 text-sm dark:text-blue-100">
							Connection Rules from Trigger:
						</div>
						<div className="space-y-1">
							{data.conditions.map((condition, _idx) => (
								<div
									key={condition.id}
									className="text-blue-800 text-sm dark:text-blue-200"
								>
									• {getRuleDisplayText(condition)}
								</div>
							))}
						</div>
					</div>
				)}

				<div className="mb-4 flex items-center justify-between border-border border-b pb-4">
					<span className="font-medium text-base text-foreground">
						Conditional Logic:
					</span>
					<div className="flex">
						<button
							type="button"
							className={`rounded-l-md border px-4 py-1.5 text-sm transition-colors ${
								data.condition_type === "all"
									? "border-primary text-primary"
									: "border-border text-foreground"
							}`}
							onClick={() => handleDataChange({ condition_type: "all" })}
						>
							AND
						</button>
						<button
							type="button"
							className={`rounded-r-md border px-4 py-1.5 text-sm transition-colors ${
								data.condition_type === "any"
									? "border-primary text-primary"
									: "border-border text-foreground"
							}`}
							onClick={() => handleDataChange({ condition_type: "any" })}
						>
							OR
						</button>
					</div>
				</div>

				<div className="space-y-1">
					<div className="flex items-center justify-between">
						<div>
							<h4 className="font-medium text-foreground text-sm">Rules</h4>
							<p className="mt-1 text-muted-foreground text-xs">
								Define rules to create branching logic for your journey.
							</p>
						</div>
						<div className="flex gap-2">
							<Button
								onClick={addCondition}
								variant="outline"
								size="sm"
								className="h-8"
							>
								<Plus className="mr-1 h-3 w-3" /> Add Rule
							</Button>
							{hasChanges && (
								<Button
									onClick={handleSave}
									variant="default"
									size="sm"
									className="h-8"
								>
									Save Rules
								</Button>
							)}
						</div>
					</div>

					{data.conditions.length === 0 ? (
						<div className="rounded-md border border-border border-dashed p-6 text-center text-muted-foreground">
							No rules added yet. Add a rule to create branching logic.
						</div>
					) : (
						<div className="space-y-0">
							{data.conditions.map((condition, index) => (
								<div key={condition.id}>
									<ConditionItem
										condition={condition}
										index={index}
										updateCondition={updateCondition}
										removeCondition={removeCondition}
									/>

									{/* Logic connector between rules */}
									{index < data.conditions.length - 1 && (
										<div className="my-2 flex items-center justify-center">
											<div className="relative flex flex-col items-center">
												<div className="h-4 w-px bg-border" />
												<div className="rounded-md border border-border bg-card px-4 py-1 font-medium text-muted-foreground text-xs">
													{data.condition_type === "all" ? "AND" : "OR"}
												</div>
												<div className="h-4 w-px bg-border" />
											</div>
										</div>
									)}
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
